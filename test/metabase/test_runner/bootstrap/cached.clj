(ns metabase.test-runner.bootstrap.cached
  (:require [metabase.bootstrap-common :as c]))

(defonce ^:private orig-load-one @#'clojure.core/load-one)

(def ^:private error-delay-ms
  "Amount of time to pause on error after printing an error message during compilation (so I have time to read it)."
  0)

(defn- load-one [lib need-ns require]
  (try
    (binding [*compile-files* true]
      (orig-load-one lib need-ns require))
    (catch Throwable e
      (c/thread-printf "%s compiling %s: %s" c/+error+ lib (c/error-message e))
      (when (pos? error-delay-ms)
        (Thread/sleep error-delay-ms))
      (orig-load-one lib need-ns require))))

(defn find-tests [options]
  (binding [*compile-path* ".cache"]
    (with-redefs [clojure.core/load-one load-one]
      ((requiring-resolve 'metabase.test-runner.bootstrap/fast-find-tests) options))))
