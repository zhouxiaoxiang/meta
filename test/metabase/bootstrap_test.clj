(ns metabase.bootstrap-test
  (:require [clojure.test :refer :all]
            [metabase.bootstrap :as bootstrap]))

(deftest parse-libspec-test
  (is (= '[x.y]
         (bootstrap/parse-libspec 'x.y)))
  (is (= '[x.y]
         (bootstrap/parse-libspec '[x.y])))
  (is (= '[x.y]
         (bootstrap/parse-libspec '[x.y :as y])))
  (is (= '[x.y]
         (bootstrap/parse-libspec '[x.y :refer [z]])))
  (is (= '[x.y.a x.y.b x.y.c]
         (bootstrap/parse-libspec '[x.y a b c])))
  (is (= '[x.y.a x.y.b x.y.c]
         (bootstrap/parse-libspec '[x.y a b [c :refer [d]]])))
  (is (= '[x.y.a]
         (bootstrap/parse-libspec '[x.y [a :as a]])))
  (is (= '[x.y.a x.y.b]
         (bootstrap/parse-libspec '[x.y [a :as a] [b :as b]])))
  (is (= '[x.y.a.b]
         (bootstrap/parse-libspec '[x.y [a [b]]])))
  (is (= '[potemkin.namespaces
           potemkin.types
           potemkin.collections
           potemkin.macros
           potemkin.utils]
         (bootstrap/parse-libspec '[potemkin namespaces types collections macros utils])))
  (is (= '[clojure.set]
         (bootstrap/parse-libspec '[clojure [set :only (union)]])))
  ;; is this even allowed?
  (is (= '[x.y.a x.y.b]
         (bootstrap/parse-libspec '[x.y [a] [b]]))))
