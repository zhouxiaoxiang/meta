(ns metabase.lib.stage-test
  (:require
   [clojure.test :refer [deftest is testing]]
   [malli.core :as mc]
   [metabase.lib.core :as lib]
   [metabase.lib.metadata.calculation :as lib.metadata.calculation]
   [metabase.lib.schema :as lib.schema]
   [metabase.lib.test-metadata :as meta]
   [metabase.lib.test-util :as lib.tu]
   #?@(:cljs ([metabase.test-runner.assert-exprs.approximately-equal]))))

(comment lib/keep-me)

#?(:cljs
   (comment metabase.test-runner.assert-exprs.approximately-equal/keep-me))

(deftest ^:parallel col-info-field-ids-test
  (testing "make sure columns are coming back the way we'd expect for :field clauses"
    (let [query {:lib/type     :mbql/query
                 :type         :pipeline
                 :stages       [{:lib/type     :mbql.stage/mbql
                                 :lib/options  {:lib/uuid "0311c049-4973-4c2a-8153-1e2c887767f9"}
                                 :source-table (meta/id :venues)
                                 :fields       [(lib.tu/field-clause :venues :price)]}]
                 :database     (meta/id)
                 :lib/metadata meta/metadata-provider}]
      (is (mc/validate ::lib.schema/query query))
      (is (=? [(merge (meta/field-metadata :venues :price)
                      {:source    :fields
                       :field_ref [:field {:lib/uuid string?} (meta/id :venues :price)]})]
              (lib.metadata.calculation/metadata query -1 query))))))

(deftest ^:parallel deduplicate-expression-names-in-aggregations-test
  (testing "make sure multiple expressions come back with deduplicated names"
    (testing "expressions in aggregations"
      (let [query (lib.tu/venues-query-with-last-stage
                   {:aggregation [[:*
                                   {}
                                   0.9
                                   [:avg {} (lib.tu/field-clause :venues :price)]]
                                  [:*
                                   {}
                                   0.8
                                   [:avg {} (lib.tu/field-clause :venues :price)]]]})]
        (is (=? [{:base_type    :type/Float
                  :name         "0_9_times_avg_price"
                  :display_name "0.9 × Average of Price"
                  :field_ref    [:aggregation {:lib/uuid string?} 0]}
                 {:base_type    :type/Float
                  :name         "0_8_times_avg_price"
                  :display_name "0.8 × Average of Price"
                  :field_ref    [:aggregation {:lib/uuid string?} 1]}]
                (lib.metadata.calculation/metadata query -1 query)))))))
