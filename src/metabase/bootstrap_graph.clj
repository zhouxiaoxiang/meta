(ns metabase.bootstrap-graph
  (:require [clojure.java.classpath :as classpath]
            [clojure.java.io :as io]
            [clojure.pprint :as pprint]
            [clojure.set :as set]
            [clojure.string :as str]
            [clojure.tools.namespace.dependency :as ns.deps]
            [clojure.tools.namespace.find :as ns.find]
            [clojure.tools.namespace.parse :as ns.parse]
            [clojure.tools.reader :as reader]))

(set! *warn-on-reflection* true)

(defn- require-forms->deps [require-forms]
  (into
   #{}
   (comp (mapcat rest)
         (map last)
         (mapcat (fn [libspec]
                   (#'clojure.tools.namespace.parse/deps-from-libspec nil libspec))))
   require-forms))

(defn- parse-jar-source [^java.util.jar.JarFile jarfile ^String entry-name]
  (with-open [r (java.io.PushbackReader. (io/reader (.getInputStream jarfile (.getEntry jarfile entry-name))))]
    (let [forms         (take-while (partial not= ::eof) (repeatedly #(reader/read {:eof ::eof} r)))
          find-forms    (fn [form-name]
                          (filter (fn [form]
                                    (and (list? form)
                                         (= (first form) form-name)))
                                  forms))
          find-form     (comp first find-forms)
          ns-form       (find-form 'ns)
          in-ns-form    (find-form 'in-ns)
          require-forms (find-forms 'require)]
      {:file  entry-name
       :ns    (or (some-> ns-form ns.parse/name-from-ns-decl)
                  (last (last in-ns-form)))
       :deps  (set/union
               (some-> ns-form ns.parse/deps-from-ns-decl)
               (when (seq require-forms)
                 (require-forms->deps require-forms)))
       :forms {:ns      ns-form
               :in-ns   in-ns-form
               :require require-forms}})))

(defonce ^:private clojure-core-requires
  (delay
    (binding [*read-eval* false]
      (let [jarfile (java.util.jar.JarFile. (io/file "/home/cam/.m2/repository/org/clojure/clojure/1.10.3/clojure-1.10.3.jar"))]
        (transduce
         (comp (map (partial parse-jar-source jarfile))
               (remove #(= (:ns %) 'clojure.core)))
         (completing (fn [m {:keys [ns deps]}]
                       (update m ns set/union deps)))
         {}
         (ns.find/sources-in-jar jarfile))))))

(def extra-deps
  '{manifold.stream.deferred #{manifold.stream.graph}})

(defonce ^:private namespace->deps
  (delay
    (into
     {}
     (map (fn [ns-decl]
            (let [lib (ns.parse/name-from-ns-decl ns-decl)]
              [lib
               (cond-> (set/union
                        (set (ns.parse/deps-from-ns-decl ns-decl))
                        (@clojure-core-requires lib)
                        (get extra-deps lib))
                 (not= lib 'clojure.core) (conj 'clojure.core))])))
     (ns.find/find-ns-decls (classpath/system-classpath)))))

(defonce ^:private deps-graph
  (delay
    (reduce
     (fn [graph [ns-symbol deps]]
       (reduce
        (fn [graph dep]
          (ns.deps/depend graph ns-symbol dep))
        graph
        deps))
     (ns.deps/graph)
     @namespace->deps)))

(defn transitive-deps [lib]
  (let [graph @deps-graph]
    (vec (sort (let [topo-comp (ns.deps/topo-comparator graph)]
                 (fn [x y]
                   (let [dep-type        (fn [lib]
                                           (cond
                                             (str/starts-with? lib "clojure")  :clojure
                                             (str/starts-with? lib "metabase") :metabase
                                             :else                             :lib))
                         [x-type y-type] (mapv dep-type [x y])
                         type->val       {:clojure 0, :lib 1, :metabase 2}
                         n               (if (= x-type y-type)
                                           (topo-comp x y)
                                           (apply compare (map type->val [x-type y-type])))]
                     #_(println "x y n:" x y n 'x-clojure? x-clojure? 'y-clojure? y-clojure? 'x-lib? x-lib? 'y-lib? y-lib?) ; NOCOMMIT
                     n)))
               (ns.deps/transitive-dependencies graph lib)))))

(defn write-deps-graph! []
  (let [deps (transitive-deps 'metabase.core)]
    (spit
     "resources/deps-graph.edn"
     (with-out-str
       (pprint/pprint
        (mapv (fn [lib]
                [lib (get @namespace->deps lib)])
              deps))))))
