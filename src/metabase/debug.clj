(ns metabase.debug
  (:require [clojure.pprint :as pprint]
            [metabase.bootstrap-common :as c]))

(defn parallel-require [libs]
  (spit "test_resources/debug.edn" (with-out-str (pprint/pprint (mapv first libs))))
  (c/init-messages-agent! (count libs))
  (try
    (reduce
     (fn [previously-loaded [lib]]
       (c/thread-printf "(require '%s)" lib)
       (flush)
       (try
         (require lib)
         (catch Throwable e
           (throw (ex-info (format "Error loading %s: %s" (pr-str lib) (ex-message e))
                           {:lib lib}
                           e))))
       (assert ((loaded-libs) lib)
               (format "Lib %s not loaded after requiring" lib))
       (let [now-loaded   (loaded-libs)
             newly-loaded (into #{} (remove previously-loaded) now-loaded)]
         (assert (= newly-loaded #{lib})
                 (format "Loading %s loaded multiple libs: %s" lib newly-loaded))
         (c/tick)
         now-loaded))
     (loaded-libs)
     libs)
    (System/exit 0)
    (catch Throwable e
      (shutdown-agents)
      (println e)
      (System/exit 2))))
