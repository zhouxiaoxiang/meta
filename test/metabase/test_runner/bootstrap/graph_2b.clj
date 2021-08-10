(ns metabase.test-runner.bootstrap.graph-2b
  (:refer-clojure :exclude [transient])
  (:require [clojure.edn :as edn]
            [clojure.java.io :as io]
            [clojure.pprint :as pprint]
            [clojure.set :as set]
            [clojure.tools.namespace.dependency :as ns.deps]))

(defn extra-deps [lib]
  (cond
    ;; See https://github.com/clj-commons/manifold/issues/207
    (= lib 'manifold.stream.deferred)
    '#{manifold.stream.graph}

    ;; include `metabase.test` as a dep for all of the test namespaces, because we need `schema=` and `re=`
    (and (re-matches #"^metabase.*test$" (str lib))
         (not= lib 'metabase.test.util))
    '#{metabase.test.util}))

(def graph
  (delay
    (with-open [r (java.io.PushbackReader. (java.io.FileReader. (java.io.File. "test_resources/graph.1.edn")))]
      (into {}
            (comp (remove (fn [[lib]] (= lib 'clojure.core)))
                  (remove (fn [[lib]] (nil? lib)))
                  (map (fn [[lib deps]]
                         [lib (->> (disj (set deps) 'clojure.core)
                                   (set/union (extra-deps lib))
                                   (into (sorted-set)))])))
            (edn/read r)))))

(def deps
  (memoize
   (fn [lib]
     (into (sorted-set) (get @graph lib)))))

(def transient-deps
  (memoize
   (fn [lib]
     (let [deps (deps lib)]
       (into
        deps
        (mapcat transient-deps)
        deps)))))

(defn simplified-deps-info [deps]
  ;; sort in order from most transient deps to least transient deps.
  (let [dep->transient-deps (into
                             {}
                             (map (juxt identity transient-deps))
                             deps)]
    (into
     []
     (map (fn [[dep transient-deps]]
            {:lib         dep
             :provides    transient-deps #_ (count transient-deps)
             ;; :provides (into (sorted-set) (filter transient-deps) deps)
             :provided-by (not-empty
                           (into
                            (sorted-set)
                            (comp (filter (fn [[_ transient-deps]]
                                            (transient-deps dep)))
                                  (map first))
                            dep->transient-deps))}))
     dep->transient-deps)))

(defn simplified-deps*
  ([deps]
   (simplified-deps* deps 10))

  ([deps max-depth]
   (when (seq deps)
     (when-not (pos? max-depth)
       (throw (ex-info "Too much recursion!" {:deps deps})))
     ;; (println "DEPS =>")                ; NOCOMMIT
     ;; (pprint/pprint deps)
     (let [infos (simplified-deps-info deps)
           kept  (into (sorted-set)
                       (comp (remove :provided-by)
                             (map :lib))
                       infos)]
       ;; (println "KEEP =>")
       ;; (pprint/pprint kept)
       (let [needed (into
                     (sorted-set)
                     (comp (map (fn [m]
                                  (update m :provided-by set/intersection kept)))
                           (remove (fn [{:keys [lib provided-by]}]
                                     (when (seq provided-by)
                                       #_(println "REMOVE" lib "PROVIDED BY" provided-by)
                                       true)))
                           (map :lib)
                           (remove kept))
                     infos)]
         ;; (println "STILL NEED =>")
         ;; (pprint/pprint needed)
         (into
          kept
          (simplified-deps* needed (dec max-depth))))))))

(def simplified-deps
  (memoize
   (fn [lib]
     (let [deps       (deps lib)
           simplified (simplified-deps* deps)]
       ;; (when-let [removed (not-empty (set/difference deps simplified))]
       ;;   (println lib "REMOVED" (count removed) "=>" (pr-str removed)))
       simplified))))

(def simplified-graph
  (delay
    (into
     {}
     (map (fn [[lib]]
            [lib (simplified-deps lib)]))
     @graph)))

(defn pretty-write [x]
  (with-open [w (java.io.FileWriter. (java.io.File. "test_resources/graph.2.edn"))]
    (pprint/pprint x w)))

(defn deps-graph []
  (reduce
   (fn [graph [lib deps]]
     (reduce
      (fn [graph dep]
        (ns.deps/depend graph lib dep))
      graph
      deps))
   (ns.deps/graph)
   (dissoc @simplified-graph nil)))

(defn all-namespaces-set []
  (into (sorted-set) (keys @graph)))

(defn topo-sort [libs]
  (sort (ns.deps/topo-comparator (deps-graph)) libs))

(defn ->infos [libs]
  (mapv (fn [lib]
          [lib (not-empty (get @simplified-graph lib))])
        libs))

(defn- smart-sort [libs]
  (let [has-deps?   #(seq (deps %))
        no-deps-set (remove has-deps? libs)
        deps-set    (filter has-deps? libs)]
    (vec
     (concat
      (topo-sort no-deps-set)
      (topo-sort deps-set)))))

(defn write-deps-graph! []
  (let [infos (-> (all-namespaces-set) smart-sort ->infos)]
    (println "Write graph for" (count infos) "namespaces")
    (with-open [w (io/writer (io/file "test_resources/graph.2.edn"))]
      (pprint/pprint infos w))))

#_(defn write-ordered-deps! []
  (let [infos (-> (all-namespaces-set) smart-sort ->infos)]
    (println "Write graph for" (count infos) "namespaces")
    (with-open [w (io/writer (io/file "test_resources/graph.3.edn"))]
      (pprint/pprint (mapv first infos) w))))
