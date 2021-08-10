(ns metabase.test-runner.bootstrap.smart-cached
  (:require [colorize.core :as colorize]
            [metabase.bootstrap-common :as c])
  (:import java.net.URL
           [java.nio.file Files LinkOption Paths]
           [java.nio.file.attribute BasicFileAttributes FileTime]))

(defonce ^:private orig-load-one @#'clojure.core/load-one)

(def ^:private debug-error-recompile-delay-ms
  "Amount of time to pause on error/recompilation so I have time to read it"
  0)

(defmacro ^:private sleep-error-recompile-delay []
  (when (pos? debug-error-recompile-delay-ms)
    `(Thread/sleep ~debug-error-recompile-delay-ms)))

(defn- resource ^URL [^String path]
  (.. (Thread/currentThread) getContextClassLoader (getResource path)))

(defn- root-resource
  "For files inside JARs, just returns the path to the JAR (since this is only used for last-modified purposes)."
  (^URL [^String root-path]
   (let [url (resource (.substring root-path 1))]
     (if-not (= (.getProtocol url) "jar")
       url
       (when-let [^String jar-filename (second (re-find #"^jar:(file:[^!]+)\!.+$" (str url)))]
         (URL. jar-filename)))))
  (^URL [lib suffix]
   (root-resource (str (#'clojure.core/root-resource lib) suffix))))

(defn- compiled-classfile ^URL [lib]
  (root-resource lib "__init.class"))

(defn- source-file ^URL [lib]
  (or (root-resource lib ".clj")
      (root-resource lib ".cljc")))

(defn- last-modified-time ^FileTime [^URL url]
  (when url
    (let [path                       (Paths/get (.toURI url))
          ^BasicFileAttributes attrs (java.nio.file.Files/readAttributes path BasicFileAttributes ^"[Ljava.nio.file.LinkOption;" (into-array LinkOption []))]
      (when attrs
        (.lastModifiedTime attrs)))))

(defn- classfile-that-needs-recompilation ^URL [lib]
  (when-let [classfile (compiled-classfile lib)]
    (when-let [source-file (source-file lib)]
      (let [last-compile-time      (last-modified-time classfile)
            last-modification-time (last-modified-time source-file)]
        (when (and last-modification-time
                   last-compile-time
                   (pos? (.compareTo last-modification-time last-compile-time)))
          classfile)))))

(defn- delete-old-compiled-files! [lib]
  (when-let [classfile (classfile-that-needs-recompilation lib)]
    (c/thread-printf "%s compiled classfile for %s" (colorize/red "DEL  ") lib)
    (sleep-error-recompile-delay)
    (Files/deleteIfExists classfile)))

(defn- load-one [lib need-ns require]
  (try
    (delete-old-compiled-files! lib)
    (binding [*compile-files* true]
      (orig-load-one lib need-ns require))
    (catch Throwable e
      (c/thread-printf "%s compiling %s: %s" c/+error+ lib (c/error-message e))
      (sleep-error-recompile-delay)
      (orig-load-one lib need-ns require))))

(defn find-tests [options]
  (binding [*compile-path* ".cache"]
    (with-redefs [clojure.core/load-one load-one]
      ((requiring-resolve 'metabase.test-runner.bootstrap/fast-find-tests) options))))
