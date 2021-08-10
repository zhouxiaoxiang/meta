(ns metabase.test-runner.bootstrap.graph
  (:require [clojure.java.io :as io]
            [clojure.pprint :as pprint]
            [clojure.set :as set]
            [clojure.string :as str]
            [clojure.tools.namespace.dependency :as ns.deps]
            [clojure.tools.namespace.find :as ns.find]
            [clojure.tools.namespace.parse :as ns.parse]
            [metabase.bootstrap-graph :as graph]))

(set! *warn-on-reflection* true)

(defn- test-namespaces []
  (into
   (sorted-set)
   (comp (map ns.parse/name-from-ns-decl)
         (filter #(str/starts-with? % "metabase"))
         (remove #(str/starts-with? % "metabase-enterprise"))
         (filter #(str/ends-with? % "test")))
   (ns.find/find-ns-decls [(io/file "test")
                           (io/file "shared/test")]
                          #_(classpath/system-classpath))))

(defn extra-deps [lib]
  (not-empty
   (set/union
    ;; all test namespaces should have an implicit dep on 'metabase.test.util
    (when (and
           (str/starts-with? lib "metabase")
           (str/ends-with? lib "test"))
      #{'metabase.test.util})
    (get
     ;; See https://github.com/clj-commons/manifold/issues/207
     '{manifold.stream.deferred #{manifold.stream.graph}}
     lib))))

(def namespace->deps
  (delay
    (into
     {}
     (map (fn [[lib deps]]
            [lib (not-empty (set/union deps (extra-deps lib)))]))
     @graph/namespace->deps)))

(def transitive-deps
  (memoize
   (fn [lib]
     (when-let [deps (not-empty (get @namespace->deps lib))]
       (into
        deps
        (mapcat transitive-deps)
        deps)))))

(defn- all-namespaces-set []
  (let [ns-set (test-namespaces)]
    (into
     ns-set
     (mapcat transitive-deps)
     ns-set)))

(defn deps-graph []
  (reduce
   (fn [graph [ns-symbol deps]]
     (reduce
      (fn [graph dep]
        (ns.deps/depend graph ns-symbol dep))
      graph
      deps))
   (ns.deps/graph)
   @namespace->deps))

(defn- all-namespaces-topo-sorted []
  (vec (sort (ns.deps/topo-comparator (deps-graph)) (all-namespaces-set))))

(defn topo-sorted-infos
  "Sequence of `[ns-symb deps-set]` in topological order."
  []
  (mapv (fn [lib]
          [lib (not-empty (get @namespace->deps lib))])
        (all-namespaces-topo-sorted)))

(defn write-deps-graph! []
  (let [infos (topo-sorted-infos)]
    (println "Write graph for" (count infos) "namespaces")
    (with-open [w (io/writer (io/file "test_resources/test-deps-graph.edn"))]
      (pprint/pprint infos w))))
