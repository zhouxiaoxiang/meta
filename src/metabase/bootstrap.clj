(ns metabase.bootstrap
  (:require [clojure.edn :as edn]
            [clojure.java.io :as io]
            [clojure.pprint :as pprint]
            [clojure.string :as str]
            [colorize.core :as colorize]
            [progrock.core :as pr])
  (:import [java.util.concurrent Executors ThreadPoolExecutor]
           org.apache.commons.lang3.concurrent.BasicThreadFactory$Builder))

(def ^:private ^Long pool-size (.availableProcessors (Runtime/getRuntime)))

(defn- thread-pool ^ThreadPoolExecutor []
  (Executors/newFixedThreadPool
   pool-size
   (.build
    (doto (BasicThreadFactory$Builder.)
      (.namingPattern "parallel-loader-%d")
      (.daemon true)))))

(defn- ordered-deps []
  (with-open [r (java.io.PushbackReader. (io/reader (io/resource "deps-graph.edn")))]
    (edn/read r)))

(defonce orig-load-one @#'clojure.core/load-one)

(def ^:private timeout-seconds 10)

(defn- thread-number []
  (or (some-> (re-matches #"^parallel-loader-(\d+)$" (.getName (Thread/currentThread)))
              last
              Integer/parseUnsignedInt)
      0))

(def ^:private thread-print-agent (agent nil))

(def ^:private csi (str \u001b \[))

(defn- redisplay [{::keys [bar], :as messages} first-message?]
  (print (str csi (if first-message?
                    "2J"                ; clear the screen
                    "1;1H")))           ; move to top-left corner
  (dotimes [i pool-size]
    (let [i       (inc i)
          message (get messages i)]
      (printf "%s2K[%2d] %s\n" csi i message)))
  (when bar
    (printf "%s2K%s\n" csi (pr/render bar)))
  #_(printf (str csi "0F"))             ; clear to the end of the screen.
  ;; clear the next few lines please
  (dotimes [_ 2]
    (print (str csi "2K\n")))
  (flush))

(defn- init-messages []
  (zipmap (range 1 (inc pool-size)) (repeat (colorize/magenta "NOT STARTED"))))

(defn- thread-printf*
  [messages thread-num s]
  (let [first-message? (not messages)
        messages       (-> (or messages (init-messages))
                           (assoc thread-num s))]
    (redisplay messages first-message?)
    messages))

(def ^:private ^:dynamic *path* [])

(defn- path-str []
  (when (seq *path*)
    (colorize/italic (format "(%s)" (str/join " -> " *path*)))))

(defn- thread-printf
  [format-string & args]
  (send thread-print-agent thread-printf* (thread-number) (str (apply format format-string args) " " (path-str))))

(defn- tick* [messages num-libs]
  {:pre [(integer? num-libs)]}
  (let [first-message? (not messages)
        messages       (-> (or messages (init-messages))
                           (update ::bar #(pr/tick (or % (pr/progress-bar num-libs)))))]
    (redisplay messages first-message?)
    messages))

(defn- tick [num-libs]
  (send thread-print-agent tick* num-libs))

(defn- await-job [lib job]
  (if-not job
    (thread-printf "%s %s" (colorize/cyan "NO JOB") lib)
    (do
      (when-not (future-done? job)
        (thread-printf "%s %s" (colorize/yellow "AWAIT") lib))
      (let [result (deref job (* timeout-seconds 1000) ::timeout)]
        (when (= result ::timeout)
          (throw (ex-info (format "Timed out waiting 10 seconds for %s to finish loading." lib)
                          {:lib lib})))
        result))))

(defmacro ^:private with-thread-pool [[pool-binding] & body]
  `(let [pool#                                                    (thread-pool)
         ~(vary-meta pool-binding assoc :tag `ThreadPoolExecutor) pool#]
     (try
       ~@body
       (finally
         (.shutdownNow pool#)))))

#_clojure.core.async

(defn parallel-require [libs]
  (let [loaded   @@#'clojure.core/*loaded-libs*
        _        (println (count loaded) "LIBS ALREADY LOADED.")
        libs     (vec (remove (fn [[lib]] (loaded lib)) libs))
        tick!    #(tick (count libs))
        lib->job (atom {})]
    (with-thread-pool [pool]
      (with-redefs [clojure.core/load-one (fn [lib _ _]
                                            (binding [*path* (conj *path* lib)]
                                              (await-job lib (get @lib->job lib))))]
        ;; create the jobs
        (doseq [[lib deps] libs
                :let       [job (.submit
                                 pool
                                 ^Callable
                                 (#'clojure.core/binding-conveyor-fn
                                  (^:once fn* []
                                   (binding [*path* [lib]]
                                     (doseq [dep deps]
                                       (await-job dep (get @lib->job dep)))
                                     (thread-printf "%s %s" (colorize/green "LOAD ") lib)
                                     (let [result (try
                                                    (assert (not (get @@#'clojure.core/*loaded-libs* lib))
                                                            (str "ALREADY LOADED: " lib))
                                                    (orig-load-one lib true true)
                                                    (catch Throwable e
                                                      (thread-printf "%s %s %s"
                                                                     (colorize/red "ERROR")
                                                                     lib
                                                                     (str/join " => " (distinct (filter some? (map :message (:via (Throwable->map e)))))))
                                                      (throw e)))]
                                       (thread-printf "%s %s" (colorize/blue "DONE ") lib)
                                       (tick!)
                                       result)))))]]
          (swap! lib->job assoc lib job))
        (doseq [[lib] libs]
          (await-job lib (get @lib->job lib)))))))

(defn load-core []
  (try
    (parallel-require (ordered-deps))
    (catch Throwable e
      (shutdown-agents)
      (pprint/pprint (Throwable->map e))
      (System/exit 1))))

;; time clojure -A:user:dev -e "(require 'metabase.core) (System/exit 0)"
;;
;; real    0m25.534s
;; user    1m7.067s
;; sys     0m3.262s

;; n = 1  => 27.928s
;; n = 2  => 22.331s
;; n = 4  => 17.421s
;; n = 8  => 15.021s
;; n = 16 => 13.483s
;; n = 32 => 13.656s
;; n = 64 => 13.683s
(defn fast-profile [num-threads]
  (.bindRoot #'pool-size num-threads)
  (load-core)
  (dotimes [_ 5]
    (println))
  (System/exit 0))

;; time clojure -A:user:dev -e "((requiring-resolve 'metabase.bootstrap/profile))"
;;
;; real    0m16.595s
;; user    2m21.020s
;; sys     0m12.651s
(defn profile []
  (load-core)
  ((requiring-resolve 'metabase.cmd/profile))
  (System/exit 0))

;; time clojure -A:user:dev -e "(require 'metabase.core) ((requiring-resolve 'metabase.cmd/profile)) (System/exit 0)"
;;
;; real    0m28.039s
;; user    1m17.168s
;; sys     0m4.428s
