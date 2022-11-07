import React, { useCallback, useState } from "react";
import { t } from "ttag";
import { connect } from "react-redux";

import Button from "metabase/core/components/Button";
import Modal from "metabase/components/Modal";

import DataApps, { ScaffoldNewPagesParams } from "metabase/entities/data-apps";

import { useDataPickerValue } from "metabase/containers/DataPicker";
import DataAppScaffoldingDataPicker from "metabase/writeback/components/DataAppScaffoldingDataPicker";

import type { DataApp } from "metabase-types/api";
import type { Dispatch, State } from "metabase-types/store";

import * as scaffold from "metabase/entities/data-apps/scaffold";

import { useDataAppContext } from "../DataAppContext";
import {
  ModalRoot,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "./AddDataToPageModal.styled";

interface OwnProps {
  dataAppId: DataApp["id"];
  onAdd: (dataApp: DataApp) => void;
  onClose: () => void;
}

interface DispatchProps {
  onScaffold: (params: ScaffoldNewPagesParams) => Promise<DataApp>;
}

type Props = OwnProps & DispatchProps;

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    onScaffold: async (params: ScaffoldNewPagesParams) => {
      const action = await dispatch(
        DataApps.objectActions.scaffoldNewPages(params),
      );
      return DataApps.HACK_getObjectFromAction(action);
    },
  };
}

function ScaffoldDataAppPagesModal() {
  const [showModal, setShowModal] = useState(false);
  const [value, setValue] = useDataPickerValue();
  const { databaseId, tableIds } = value;

  console.log({ value });

  const { dataApp } = useDataAppContext();
  console.log("dataApp", dataApp);

  const handleAdd = useCallback(async () => {
    console.log("add to app", dataApp?.id, tableIds);
    const results = await Promise.all(
      tableIds.map(tableId =>
        scaffold.model({
          tableId: Number(tableId),
          databaseId: Number(databaseId),
          collectionId: Number(dataApp?.collection_id),
        }),
      ),
    );
    console.log(results);
  }, [dataApp, tableIds, databaseId]);

  const canSubmit = tableIds.length > 0;

  return (
    <>
      <Button
        primary
        onClick={() => setShowModal(true)}
      >{t`Add some data`}</Button>
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <ModalRoot>
            <ModalHeader>
              <ModalTitle>{t`Pick your data`}</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <DataAppScaffoldingDataPicker value={value} onChange={setValue} />
            </ModalBody>
            <ModalFooter>
              <Button onClick={() => setShowModal(false)}>{t`Cancel`}</Button>
              <Button
                primary
                disabled={!canSubmit}
                onClick={handleAdd}
              >{t`Add`}</Button>
            </ModalFooter>
          </ModalRoot>
        </Modal>
      )}
    </>
  );
}

export default connect<unknown, DispatchProps, OwnProps, State>(
  null,
  mapDispatchToProps,
)(ScaffoldDataAppPagesModal);
