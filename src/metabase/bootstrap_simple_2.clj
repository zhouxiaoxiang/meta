(ns metabase.bootstrap-simple-2
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
  {:pre [(sequential? libs)]}
  (c/init-messages-agent! (count libs))
  (let [ready-libs            (filterv (fn [[_ deps]]
                                         (empty? deps))
                                       libs)
        lib->deps             (into {} libs)
        lib->unsatisfied-deps (atom lib->deps)
        lib->dependents       (reduce
                               (fn [m [lib deps]]
                                 (reduce
                                  (fn [m dep]
                                    (update m dep (comp set conj) lib))
                                  m
                                  deps))
                               {}
                               libs)
        lib->job              (atom {})
        submitted             (atom #{})
        error                 (promise)]
    (with-redefs [clojure.core/load-one (fn [lib _ _]
                                          (try
                                            (binding [c/*path* (conj c/*path* lib)]
                                              (await-job lib (get @lib->job lib)))
                                            (catch Throwable e
                                              (deliver error e)
                                              (throw e))))]
      ;; create the jobs
      (letfn [(submit-job! [lib]
                (try
                  (when (get @submitted lib)
                    (throw (ex-info (format "ALREADY SUBMITTED! %s" lib) {:lib lib})))
                  (let [deps (get lib->deps lib)
                        job  (c/submit!
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
                                                  (let [e (throw (ex-info (format "Error loading %s: %s" lib (ex-message e))
                                                                          {:lib lib}
                                                                          e))]
                                                    (c/thread-printf "%s %s %s" c/+error+ lib (c/error-message e))
                                                    (deliver error e)
                                                    (throw e))))]
                                   (c/thread-printf c/+ready+)
                                   (c/tick)
                                   (submit-jobs-for-dependents! lib)
                                   result))))]
                    (swap! lib->job assoc lib job)
                    job)
                  (catch Throwable e
                    (deliver error e)
                    (throw e))))
              (submit-jobs-for-dependents! [lib]
                (when-let [deps (not-empty (get lib->dependents lib))]
                  (let [lib->unsatisfied (swap! lib->unsatisfied-deps (fn [lib->unsatisfied]
                                                                        (reduce
                                                                         (fn [lib->unsatisfied dep]
                                                                           (update lib->unsatisfied dep disj lib))
                                                                         lib->unsatisfied
                                                                         deps)))]
                    (doseq [dep deps]
                      (when (empty? (get lib->unsatisfied dep))
                        #_(c/thread-printf "Submit job %s dependent %s" lib dep)
                        (submit-job! dep))))))]
        ;; submit the initial jobs for dependencies that are ready
        (doseq [[lib] ready-libs]
          (submit-job! lib)))
      ;; now wait for all of the jobs to finish.
      (doseq [[lib] libs]
        (when (realized? error)
          (throw @error))
        (await-job lib (get @lib->job lib)))
      (when (realized? error)
        (throw @error)))))
