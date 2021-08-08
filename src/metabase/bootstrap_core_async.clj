(ns metabase.bootstrap-core-async
  (:require [clojure.core.async :as a]
            [clojure.set :as set]
            [clojure.tools.logging :as log]
            [metabase.bootstrap-common :as c]))

(log/trace "SHHH") ; complains when loggers get initialized otherwise.

(defn- await-job [lib chan]
  {:pre [(some? chan)]}
  #_(c/thread-printf "%s %s" c/+await+ lib)
  (let [result (a/<!! chan)]
    (assert result)
    (assert (not (instance? clojure.lang.Agent result)))
    (when (instance? Throwable result)
      (throw result))
    result))

(defn parallel-require [libs]
  (let [loaded       @@#'clojure.core/*loaded-libs*
        _            (println (count loaded) "LIBS ALREADY LOADED.")
        libs         (vec (remove (fn [[lib]] (loaded lib)) libs))
        libs         (mapv (fn [[lib deps]]
                             [lib (set/difference deps loaded)])
                           libs)
        ;; lib->job (atom {})
        lib->chan    (into {}
                           (map (fn [[lib]]
                                  [lib (a/promise-chan)]))
                           libs)
        ready-chan   (a/chan (count libs))
        lib-ready?   (fn [[_ deps]]
                       (empty? deps))
        ready-libs   (filter lib-ready? libs)
        unready-libs (remove lib-ready? libs)]
    (c/thread-printf "# ready: %d # unready: %d" (count ready-libs) (count unready-libs))
    (try
      ;; for each unready lib start some core async blocks that will wait for dependencies to be loaded and then
      ;; mark the lib as ready for loading.
      (c/thread-printf "Creating core.async blocks...")
      (doseq [[lib deps] unready-libs
              :let       [lib-chan (get lib->chan lib)]]
        (assert (symbol? lib))
        (a/go
          (doseq [dep  deps
                  :let [dep-chan (get lib->chan dep)
                        result   (a/<! dep-chan)]]
            (when (instance? Throwable result)
              (a/>! lib-chan result)
              (a/close! lib-chan)))
          (a/>! ready-chan lib)))
      ;; submit all the jobs that are ready to go. Start a core.async loop to start other jobs as they become
      ;; ready.
      (c/thread-printf "Submitting jobs...")
      (with-redefs [clojure.core/load-one (fn [lib _ _]
                                            (binding [c/*path* (conj c/*path* lib)]
                                              (await-job lib (get lib->chan lib))))]
        (letfn [(submit-job! [lib]
                  (c/submit!
                   (^:once fn* []
                    (binding [c/*path* [lib]]
                      (c/thread-printf "%s %s" c/+load+ lib)
                      (try
                        (assert (not (get @@#'clojure.core/*loaded-libs* lib))
                                (str "ALREADY LOADED: " lib))
                        (let [result (c/orig-load-one lib true true)]
                          (assert (not (instance? clojure.lang.Agent result)) "WHY IS IT AN AGENT!!")
                          (a/>!! (get lib->chan lib) result)
                          (c/thread-printf c/+ready+)
                          (c/tick)
                          result)
                        (catch Throwable e
                          (c/thread-printf "%s %s %s" c/+error+ lib (c/error-message e))
                          (a/>!! (get lib->chan lib) e)
                          #_(a/close! ready-chan)
                          (throw e))
                        (finally
                          (a/close! (get lib->chan lib))))))))]
          (doseq [[lib] ready-libs]
            (submit-job! lib))
          (a/go-loop []
            (when-let [lib (a/<! ready-chan)]
              (submit-job! lib)
              (recur)))))
      ;; wait for everything to finish.
      (doseq [[i [lib]] (map-indexed vector libs)
              :let      [chan (get lib->chan lib)]]
        (c/thread-printf "%s %3d/%3d jobs (%s)" c/+await+ (- (count libs) i) (count libs) lib)
        (await-job lib chan))
      (catch Throwable e
        (c/thread-printf "%s [core async bootstrapper] %s" c/+error+ (c/error-message e))
        (throw e))
      (finally
        (doseq [[_ chan] lib->chan]
          (a/close! chan))
        (a/close! ready-chan)))))
