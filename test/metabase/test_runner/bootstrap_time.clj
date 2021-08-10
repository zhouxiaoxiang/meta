(ns metabase.test-runner.bootstrap-time)

(defn time-all [options]
  (let [start        (System/currentTimeMillis)
        f            (requiring-resolve 'metabase.test-runner.bootstrap/time-all)
        load-ns-time (- (System/currentTimeMillis) start)

        {:keys [deps-time bootstrapper-time bootstrap-time find-tests-time]}
        (f options)]
    (println (format "load first ns     took %.3fs" (/ load-ns-time 1000.0)))
    (println (format "load deps         took %.3fs" (/ deps-time 1000.0)))
    (println (format "                    => %.3fs" (-> (+ load-ns-time deps-time) (/ 1000.0))))
    (println (format "load bootstrapper took %.3fs" (/ bootstrapper-time 1000.0)))
    (println (format "                    => %.3fs" (-> (+ load-ns-time deps-time bootstrapper-time) (/ 1000.0))))
    (println (format "bootstrap         took %.3fs" (/ bootstrap-time 1000.0)))
    (println (format "                    => %.3fs" (-> (+ load-ns-time deps-time bootstrapper-time bootstrap-time) (/ 1000.0))))
    (println (format "find tests        took %.3fs" (/ find-tests-time 1000.0)))
    (println (format "TOTAL               => %.3fs" (-> (+ load-ns-time deps-time bootstrapper-time bootstrap-time find-tests-time) (/ 1000.0))))))
