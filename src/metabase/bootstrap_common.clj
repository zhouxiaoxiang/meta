(ns metabase.bootstrap-common
  (:require [clojure.edn :as edn]
            [clojure.set :as set]
            [clojure.string :as str]
            [colorize.core :as colorize]
            [progrock.core :as pr])
  (:import [java.util.concurrent Executors ThreadPoolExecutor]
           org.apache.commons.lang3.concurrent.BasicThreadFactory$Builder))

(def ^Long pool-size (.availableProcessors (Runtime/getRuntime)))

(defonce orig-load-one @#'clojure.core/load-one)

(def ^:private pool*
  (delay
    (println "pool-size:" pool-size) ; NOCOMMIT
    (Executors/newFixedThreadPool
     pool-size
     (.build
      (doto (BasicThreadFactory$Builder.)
        (.namingPattern "parallel-loader-%d")
        (.daemon true))))))

(def core-deps*
  (delay
    (with-open [r (java.io.PushbackReader. (java.io.FileReader. (java.io.File. "resources/deps-graph.edn")))]
      (edn/read r))))

(defn remove-already-loaded [ordered-deps]
  (let [loaded @@#'clojure.core/*loaded-libs*]
    (printf "%d deps already loaded\n" (count loaded))
    (into
     []
     (comp (remove (fn [[lib]] (loaded lib)))
           (map (fn [[lib deps]]
                  [lib (set/difference deps loaded)])))
     ordered-deps)))

(defn core-deps []
  (remove-already-loaded @core-deps*))

(defn- thread-pool ^ThreadPoolExecutor []
  @pool*)

(defn submit! ^java.util.concurrent.Future [^Callable f]
  (.submit (thread-pool) ^Callable (#'clojure.core/binding-conveyor-fn f)))

(defn thread-number
  ([]
   (thread-number (Thread/currentThread)))

  ([^Thread thread]
   (or (some-> (re-matches #"^parallel-loader-(\d+)$" (.getName thread))
               last
               Integer/parseUnsignedInt)
       0)))

(def ^:private thread-print-agent (agent nil))

(def ^:const +csi+                    (str \u001b \[))
(def ^:const +clear-line+             (str +csi+ "2K"))
(def ^:const +clear-to-end-of-screen+ (str +csi+ "0J"))
(def ^:const +clear-entire-screen+    (str +csi+ "2J"))
(def ^:const +move-to-top-left+       (str +csi+ "1;1H"))

(defn- redisplay [{::keys [bar], :as messages} first-message?]
  (print (if first-message?
           +clear-entire-screen+
           +move-to-top-left+))         ; move to top-left corner
  (printf "%s%s\n" +clear-line+ (get messages 0))
  (dotimes [i pool-size]
    (let [i       (inc i)
          message (get messages i)]
      (printf "%s[%2d] %s\n" +clear-line+ i message)))
  (when bar
    (printf "%s%s\n" +clear-line+ (pr/render bar)))
  (print +clear-to-end-of-screen+)
  ;; ;; clear the next few lines please
  ;; (dotimes [_ 2]
  ;;   (print (str +csi+ "2K\n")))
  (flush))

(defn- messages-init-value [num-libs]
  (assoc (zipmap (range 1 (inc pool-size)) (repeat (colorize/magenta "WAITING FOR JOB")))
         ::bar (pr/progress-bar num-libs)
         ::first-message? true))

(defn init-messages-agent! [num-libs]
  (send thread-print-agent (constantly (messages-init-value num-libs))))

(defn- thread-printf*
  [messages thread-num s]
  (let [first-message? (::first-message? messages)
        messages       (-> messages
                           (assoc thread-num s)
                           (dissoc ::first-message))]
    (redisplay messages first-message?)
    messages))

(def ^:dynamic *path* [])

(defn- path-str []
  (when (seq *path*)
    (colorize/italic (format "(%s)" (str/join " -> " *path*)))))

(defn thread-printf
  ([msg]
   (send thread-print-agent thread-printf* (thread-number) (str msg " " (path-str))))

  ([format-string & args]
   (thread-printf (apply format format-string args))))

(defn- tick* [messages]
  (let [first-message? (::first-message? messages)
        messages       (-> messages
                           (update ::bar pr/tick)
                           (dissoc ::first-message?))]
    (redisplay messages first-message?)
    messages))

(defn tick []
  (send thread-print-agent tick*))

(def ^:const +await+ (colorize/yellow  "AWAIT"))
(def ^:const +load+  (colorize/green   "LOAD "))
(def ^:const +ready+ (colorize/blue    "READY"))
(def ^:const +error+ (colorize/red     "ERROR"))
(def ^:const +done+  (colorize/yellow  "DONE "))

(defn error-message [e]
  (str/join " => " (distinct (filter some? (map :message (:via (Throwable->map e)))))))
