(ns metabase.driver.driver-deprecation-test-new
  "Dummy driver for driver deprecation testing (new driver)"
  (:require [metabase.driver :as driver]
            metabase.driver.sql))

(comment metabase.driver.sql/keep-me)

(driver/register! :driver-deprecation-test-new, :parent :sql)
