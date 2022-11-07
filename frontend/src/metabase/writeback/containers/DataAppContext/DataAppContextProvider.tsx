import React, { useCallback, useMemo, useState } from "react";
import { withRouter } from "react-router";
import { connect } from "react-redux";
import _ from "lodash";
import __ from "underscore";
import { getIn } from "icepick";

import * as Urls from "metabase/lib/urls";
import DataApps from "metabase/entities/data-apps";
import {
  getDashboard,
  getDashcards,
  getDataApp,
  getCardData,
  getIsLoadingComplete,
} from "metabase/dashboard/selectors";

import type { DataAppPage, DataApp } from "metabase-types/api";
import type { CardId } from "metabase-types/types/Card";
import type { DashCard, DashCardId } from "metabase-types/types/Dashboard";
import type { Dataset } from "metabase-types/types/Dataset";
import type { State } from "metabase-types/store";

import {
  DataAppContext,
  DataAppContextType,
  DataContextType,
} from "./DataAppContext";
import { formatDataAppString, turnRawDataIntoObjectDetail } from "./utils";

interface DataAppContextProviderOwnProps {
  children: React.ReactNode;
}

interface DataAppContextProviderStateProps {
  page?: DataAppPage;
  dataApp?: DataApp;
  dashCards: Record<DashCardId, DashCard>;
  dashCardData: Record<DashCardId, Record<CardId, Dataset>>;
  isLoaded: boolean;
}

type DataAppContextProviderProps = DataAppContextProviderOwnProps &
  DataAppContextProviderStateProps;

function mapStateToProps(state: State, { dataApp }: { dataApp: DataApp }) {
  return {
    page: getDashboard(state),
    dataApp,
    dashCards: getDashcards(state),
    dashCardData: getCardData(state),
    isLoaded: getIsLoadingComplete(state),
  };
}

function DataAppContextProvider({
  page,
  dataApp,
  dashCards = [],
  dashCardData = {},
  isLoaded,
  children,
}: DataAppContextProviderProps) {
  const [bulkActionCardId, setBulkActionCardId] = useState<number | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const handleRowSelected = useCallback(
    (cardId: number, rowIndex: number) => {
      if (bulkActionCardId !== cardId) {
        setBulkActionCardId(cardId);
        setSelectedRows([rowIndex]);
      } else {
        setSelectedRows(rows => rows.concat(rowIndex));
      }
    },
    [bulkActionCardId],
  );

  const handleRowDeselected = useCallback(
    (rowIndex: number) => {
      const nextRows = selectedRows.filter(row => row !== rowIndex);
      setSelectedRows(nextRows);
      if (nextRows.length === 0) {
        setBulkActionCardId(null);
      }
    },
    [selectedRows],
  );

  const handleClearSelection = useCallback(() => {
    setSelectedRows([]);
    setBulkActionCardId(null);
  }, []);

  const objectDetails = useMemo(
    () =>
      Object.values(dashCards).filter(
        dashCard => dashCard.card.display === "object",
      ),
    [dashCards],
  );

  const dataContext = useMemo(() => {
    const context: DataContextType = {};

    objectDetails.forEach(dashCard => {
      const formattedCardName = _.camelCase(dashCard.card.name);
      const data = getIn(dashCardData, [dashCard.id, dashCard.card.id]);
      if (data) {
        context[formattedCardName] = turnRawDataIntoObjectDetail(data);
      }
    });

    return context;
  }, [objectDetails, dashCardData]);

  const context: DataAppContextType = useMemo(() => {
    const value: DataAppContextType = {
      isDataApp: !!page?.is_app_page,
      dataApp,
      data: dataContext,
      isLoaded,
      bulkActions: {
        cardId: bulkActionCardId,
        selectedRowIndexes: selectedRows,
        addRow: handleRowSelected,
        removeRow: handleRowDeselected,
        clearSelection: handleClearSelection,
      },
      format: (text: string) => text,
    };

    value.format = (text: string) => formatDataAppString(text, value);

    return value;
  }, [
    page,
    dataApp,
    dataContext,
    isLoaded,
    bulkActionCardId,
    selectedRows,
    handleRowSelected,
    handleRowDeselected,
    handleClearSelection,
  ]);

  return (
    <DataAppContext.Provider value={context}>
      {children}
    </DataAppContext.Provider>
  );
}

function getDataAppId(state: State, props: any) {
  return Urls.extractEntityId(props?.params?.slug);
}

export default __.compose(
  withRouter,
  DataApps.load({ id: getDataAppId }),
  connect(mapStateToProps),
)(DataAppContextProvider);
