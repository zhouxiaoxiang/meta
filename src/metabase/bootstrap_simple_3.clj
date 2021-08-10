(ns metabase.bootstrap-simple-3
  (:require [colorize.core :as colorize]
            [metabase.bootstrap-common :as c]))

(defn no-op [_])

(def ^:private timeout-seconds 30)

(defn- on-finish-fns [libs]
  (reduce
   (fn [lib->on-finish [lib deps]]
     (if (empty? deps)
       lib->on-finish
       (let [awaiting     (atom deps)
             on-finish-fn (fn [dep]
                            (fn on-finish* [submit-job!]
                              ;; (c/thread-printf "%s %s" (colorize/magenta "AFTER") dep)
                              (when (empty? (swap! awaiting disj dep))
                                (c/thread-printf "%s %s" (colorize/yellow "START") lib)
                                (submit-job! lib))
                              submit-job!))]
         (reduce
          (fn [lib->on-finish dep]
            (update lib->on-finish dep (fnil comp identity) (on-finish-fn dep)))
          lib->on-finish
          deps))))
   {}
   libs))

(defn- on-error [{:keys [lib error]} e]
  (c/thread-printf "%s %s %s" c/+error+ lib (c/error-message e))
  (deliver error e)
  (throw e))

(defn- assert-not-already-loaded [{:keys [lib], :as context}]
  (when (get (loaded-libs) lib)
    (on-error context (ex-info (str "Already loaded: " lib) {:lib lib}))))

(defn- job [{:keys [lib error], :as context} on-finish]
  (^:once fn* []
   (when-not (realized? error)
     (try
       (assert-not-already-loaded context)
       (c/thread-printf "%s %s" c/+load+ lib)
       (let [result (c/orig-load-one lib true true)]
         (c/thread-printf "%s %s" c/+done+ lib)
         (c/tick)
         (when on-finish
           (on-finish))
         result)
       (catch Throwable e
         (on-error context e))))))

(defn- submit-job! [{:keys [lib->job lib->on-finish error lib], :as context}]
  (when (get @lib->job lib)
    (on-error context (ex-info (str "Job already submitted:" lib) {:lib lib})))
  (assert-not-already-loaded context)
  (when-not (realized? error)
    (let [on-finish (when-let [on-finish* (get lib->on-finish lib)]
                      (^:once fn* []
                       (try
                         (on-finish* (fn [lib]
                                       (submit-job! (assoc context :lib lib))))
                         (catch Throwable e
                           (on-error context (ex-info (format "Error in on-finish for %s" lib) {:lib lib}))))))
          job       (c/submit! (job context on-finish))]
      (swap! lib->job assoc lib job))))

(defn- await-all [{:keys [libs lib->job error]}]
  (doseq [[lib] libs]
    (when (realized? error)
      (throw @error))
    (c/thread-printf "%s %s" c/+await+ lib)
    (when (= (deref (get @lib->job lib) (* timeout-seconds 1000) ::timeout) ::timeout)
      (throw (ex-info (format "Timed out waiting %d seconds for %s to finish." timeout-seconds lib)
                      {:lib lib}))))
  (when (realized? error)
    (throw @error)))

(defn parallel-require [libs]
  (c/init-messages-agent! (count libs))
  (let [context {:libs           libs
                 :lib->job       (atom {})
                 :error          (promise)
                 :lib->on-finish (on-finish-fns libs)}]
    ;; submit all ready jobs.
    (doseq [[lib deps] libs
            :when      (empty? deps)]
      (submit-job! (assoc context :lib lib)))
    ;; now wait for all the jobs to finish.
    (await-all context)))
