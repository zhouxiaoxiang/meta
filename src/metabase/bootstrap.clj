(ns metabase.bootstrap
  (:require [colorize.core :as colorize]
            [metabase.bootstrap-common :as c]))

(def ^:private timeout-seconds 30)

(defn- await-job [lib job]
  (if-not job
    (do
      (c/thread-printf "%s %s" (colorize/cyan "NO JOB") lib)
      nil)
    (do
      (when-not (future-done? job)
        (c/thread-printf "%s %s" c/+await+ lib))
      (let [result (deref job (* timeout-seconds 1000) ::timeout)]
        (when (= result ::timeout)
          (throw (ex-info (format "Timed out waiting %d seconds for %s to finish loading." timeout-seconds lib)
                          {:lib lib})))
        result))))

(defn parallel-require [libs]
  (c/init-messages-agent! (count libs))
  (let [lib->job (atom {})]
    (with-redefs [clojure.core/load-one (fn [lib _ _]
                                          (binding [c/*path* (conj c/*path* lib)]
                                            (await-job lib (get @lib->job lib))))]
      ;; create the jobs
      (doseq [[lib deps] libs
              :let       [job (c/submit!
                               (^:once fn* []
                                (binding [c/*path* [lib]]
                                  (doseq [dep deps]
                                    (await-job dep (get @lib->job dep)))
                                  (c/thread-printf "%s %s" c/+load+ lib)
                                  (let [result (try
                                                 (assert (not (get @@#'clojure.core/*loaded-libs* lib))
                                                         (str "ALREADY LOADED: " lib))
                                                 (c/orig-load-one lib true true)
                                                 (catch Throwable e
                                                   (c/thread-printf "%s %s %s" c/+error+ lib (c/error-message e))
                                                   (throw e)))]
                                    (c/thread-printf c/+ready+)
                                    (c/tick)
                                    result))))]]
        (swap! lib->job assoc lib job))
      (doseq [[lib] libs]
        (await-job lib (get @lib->job lib))))))
