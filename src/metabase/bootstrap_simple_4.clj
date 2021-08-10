(ns metabase.bootstrap-simple-4
  (:refer-clojure :exclude [load])
  (:require [metabase.bootstrap-common :as c])
  (:import clojure.lang.PersistentQueue))

(defn no-op [_])

(def ^:private timeout-seconds 120)

(defn- combine-fns [f1 f2]
  (if-not f1
    f2
    (^:once fn* [] (concat (f1) (f2)))))

(defn- on-finish-fns [libs]
  (reduce
   (fn [lib->on-finish [lib deps]]
     (if (empty? deps)
       lib->on-finish
       (let [awaiting (atom deps)
             f        (^:once fn* [dep]
                       (^:once fn* []
                        (when (empty? (swap! awaiting disj dep))
                          [lib])))]
         (reduce
          (fn [lib->on-finish dep]
            (update lib->on-finish dep combine-fns (f dep)))
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

(declare submit-job!)

(defn- load*
  "Returns sequence of next jobs to run."
  [{:keys [lib error lib->on-finish], :as context}]
  (let [on-finish (get lib->on-finish lib)]
    (try
      (assert-not-already-loaded context)
      (c/thread-printf "%s %s" c/+load+ lib)
      (let [result (c/orig-load-one lib true true)]
        (c/tick)
        (when on-finish
          (on-finish)))
      (catch Throwable e
        (on-error context e)))))

(defn- load [{:keys [lib error lib->on-finish], :as context}]
  (when-not (realized? error)
    (let [[next & more :as next-deps] (load* context)]
      (if (empty? next-deps)
        (c/thread-printf "%s %s" c/+done+ lib)
        (do
          (doseq [lib more]
            (submit-job! (assoc context :lib lib)))
          (recur (assoc context :lib next)))))))

(defn- submit-job! [{:keys [jobs error], :as context}]
  ;; (when (get @jobs lib)
  ;;   (on-error context (ex-info (str "Job already submitted:" lib) {:lib lib})))
  (assert-not-already-loaded context)
  (when-not (realized? error)
    (let [job (c/submit! (^:once fn* [] (load context)))]
      (swap! jobs conj job))))

(defn- await-all [{:keys [jobs error]}]
  (loop []
    (c/thread-printf "%s %d" c/+await+ (count @jobs))
    (when (realized? error)
      (throw @error))
    (when-let [job (peek @jobs)]
      (swap! jobs pop)
      (when (= (deref job (* timeout-seconds 1000) ::timeout) ::timeout)
        (throw (ex-info (format "Timed out waiting %d seconds for job to finish." timeout-seconds) {})))
      (recur))))

(defn parallel-require [libs]
  (c/init-messages-agent! (count libs))
  (let [context {:libs           libs
                 :jobs           (atom (PersistentQueue/EMPTY))
                 :error          (promise)
                 :lib->on-finish (on-finish-fns libs)}]
    ;; submit all ready jobs.
    (doseq [[lib deps] libs
            :when      (empty? deps)]
      (submit-job! (assoc context :lib lib)))
    ;; now wait for all the jobs to finish.
    (await-all context)))
