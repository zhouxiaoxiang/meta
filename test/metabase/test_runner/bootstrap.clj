(ns metabase.test-runner.bootstrap
  (:require [clojure.edn :as edn]
            [metabase.bootstrap-common :as c]
            [metabase.bootstrap-hybrid :as b]))

(try
  (let [m (doto (.getDeclaredMethod java.lang.ClassLoader$ParallelLoaders "register" (into-array Class [Class]))
            (.setAccessible true))]
    (.invoke m java.lang.ClassLoader$ParallelLoaders (into-array Object [clojure.lang.DynamicClassLoader])))
  (catch Throwable _
    (println "Unable to register DynamicClassLoader as parallel")))

#_(.isRegisteredAsParallelCapable @(clojure.lang.Compiler/LOADER))

;; time clojure -X:dev:find-tests
;; Looking for test namespaces in directory test
;; Looking for test namespaces in directory shared/test
;; Load driver :sql-jdbc took 289.2 ms
;; Added test extensions for :sql/test-extensions 💯
;; Running 2286 tests
;; "Elapsed time: 36774.749752 msecs"
;; Found 2286 tests.
;; real    0m38.457s
;; user    1m27.827s
;; sys     0m3.437s
(defn find-tests
  [options]
  (let [tests (time ((requiring-resolve 'metabase.test-runner/tests) options))]
    (printf "Found %d tests." (count tests))
    (flush)
    (System/exit 0)))

(defn ordered-deps []
  (c/remove-already-loaded
   (with-open [r (java.io.PushbackReader. (java.io.FileReader. (java.io.File. "test_resources/graph.2.edn")))]
     (edn/read r))))

;;        [SERIAL]  :simple    :simple-2  :simple-3  :simple-4 [quiet]
;; n =  1 0m38.457s 0m40.700s  0m42.364s  0m42.798s  0m42.440s
;; n =  2     -     0m30.606s  0m26.417s  0m27.512s  0m25.595s
;; n =  4     -     0m23.962s  0m20.694s  0m20.319s  0m19.720s
;; n =  8     -     0m21.273s  0m19.377s  0m18.722s  0m18.569s
;; n = 16     -     0m19.423s  0m19.633s  0m19.340s  0m18.955s 0m16.277s
;; n = 32     -     0m18.974s  0m20.244s  0m19.551s  0m19.341s 0m16.869s
;; n = 64     -     0m19.128s  0m20.208s  0m19.153s  0m18.989s
(defn fast-find-tests [{:keys [bootstrapper threads]
                        :or   {bootstrapper :simple
                               threads      (.availableProcessors (Runtime/getRuntime))}
                        :as   options}]
  (.bindRoot #'c/pool-size threads)
  (try
    (let [bootstrapper (b/bootstrapper bootstrapper)]
      (bootstrapper (ordered-deps)))
    (let [tests ((requiring-resolve 'metabase.test-runner/tests) options)]
      (c/thread-printf c/+done+)
      (shutdown-agents)
      (println c/+clear-to-end-of-screen+)
      (printf "Found %d tests. (bootstrapper: %s; threads = %d)\n" (count tests) bootstrapper threads)
      (flush))
    (System/exit 0)
    (catch Throwable e
      (c/thread-printf "%s %s" c/+error+ (c/error-message e))
      (shutdown-agents)
      (println e)
      (System/exit 2))))


#_(defn time-all [{:keys [bootstrapper threads]
                   :or   {bootstrapper :simple
                          threads      (.availableProcessors (Runtime/getRuntime))}
                   :as   options}]
    (.bindRoot #'c/pool-size threads)
    (letfn [(timed [f]
              (let [start  (System/currentTimeMillis)
                    result (f)]
                [result (- (System/currentTimeMillis) start)]))]
      (let [[deps deps-time]                 (timed ordered-deps)
            [bootstrapper bootstrapper-time] (timed #(b/bootstrapper bootstrapper))
            [bootstrap bootstrap-time]       (timed #(bootstrapper deps))
            [find-tests find-tests-time]     (timed #((requiring-resolve 'metabase.test-runner/tests) options))]
        (shutdown-agents)
        (println c/+clear-to-end-of-screen+)
        {:deps-time         deps-time
         :bootstrapper-time bootstrapper-time
         :bootstrap-time    bootstrap-time
         :find-tests-time   find-tests-time})))
