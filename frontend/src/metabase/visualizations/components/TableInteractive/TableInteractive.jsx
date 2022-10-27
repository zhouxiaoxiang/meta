/* eslint-disable react/prop-types */
import React from "react";

import { t } from "ttag";
import { connect } from "react-redux";
import _ from "underscore";

import '@glideapps/glide-data-grid/dist/index.css'
import { DataEditor, GridCellKind } from "@glideapps/glide-data-grid";

import "./TableInteractive.css";

import Button from "metabase/core/components/Button";
import Tooltip from "metabase/components/Tooltip";
import ExplicitSize from "metabase/components/ExplicitSize";
import { executeRowAction } from "metabase/dashboard/actions";
import { color, lighten } from "metabase/lib/colors";

const ROW_HEIGHT = 36;
const SIDEBAR_WIDTH = 38;

function TableInteractive({ card, data, dispatch }) {
  if (!card || !data ) {
    return null;
  }

  const columns = data?.cols?.map((col) => {
    return {
      title: col.display_name ?? '',
      id: col.name,

    };
  })

  const getData = ([col, row]) => {
    return {
      kind: GridCellKind.Text,
      data: String(data.rows[row][col]) ?? '',
      displayData: String(data.rows[row][col]) ?? '',
      readOnly: true,
      allowOverlay: true,
    };
  };

  const onCellEdited = ([col, row], newValue) => {
    const pk = Number(data.rows[row][0]);
    const editedColumn = data.cols[col].name;
    const editPayload = {
      id: Number(pk),
      [editedColumn]: newValue.data,
    };
    const rollback = data.rows[row][col];
    data.rows[row][col] = newValue.data;

    return executeRowAction({
      page: { id: 175 },
      dashcard: { id: 719, card_id: 438, action: { slug: 'update' } },
      parameters: editPayload,
      dispatch,
      shouldToast: true,
    }).then(res => {
      if (!res.success) {
        data.rows[row][col] = rollback;
      }
    })
  };

  return (
    <div style={{ height: '100%'}}>
      <DataEditor
        getCellContent={getData}
        columns={columns}
        rows={data.rows.length}
        onCellEdited={onCellEdited}
        onColumnResize={(col, width) => {
          console.log('onColumnResize', col, width);
        }}
        height='100%'
        width='100%'
        theme={{
          fontFamily: 'Lato, sans-serif',
          baseFontStyle: 'bold 12.5px',
          textDark: color('text-dark'),
          textLight: color('text-light'),
          textMedium: color('text-medium'),
          borderColor: 'transparent',
          accentColor: color('brand'),
          bgHeader: color('white'),
          accentLight: lighten('brand', 0.4),
          textHeader: color('brand'),
          headerBackground: color('bg-light'),
          horizontalBorderColor: color('border'),
        }}
      />
    </div>
  );
}

export default _.compose(
  ExplicitSize({
    refreshMode: props => (props.isDashboard ? "debounce" : "throttle"),
  }),
  connect(),
)(TableInteractive);

const DetailShortcut = React.forwardRef((_props, ref) => (
  <div
    id="detail-shortcut"
    className="TableInteractive-cellWrapper cursor-pointer"
    ref={ref}
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      height: ROW_HEIGHT,
      width: SIDEBAR_WIDTH,
      zIndex: 3,
    }}
  >
    <Tooltip tooltip={t`View Details`}>
      <Button
        iconOnly
        iconSize={10}
        icon="expand"
        className="TableInteractive-detailButton"
      />
    </Tooltip>
  </div>
));

DetailShortcut.displayName = "DetailShortcut";
