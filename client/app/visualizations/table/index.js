/*eslint-disable */

import moment from 'moment';
import { _, partial, isString } from 'underscore';
import { replaceAll, numberFormat } from 'underscore.string';
import { getColumnCleanName } from '@/services/query-result';
import template from './table.html';

function formatValue($filter, clientConfig, value, type) {
  let formattedValue = value;
  switch (type) {
    case 'integer':
      formattedValue = $filter('number')(value, 0);
      break;
    case 'float':
      formattedValue = $filter('number')(value, 2);
      break;
    case 'boolean':
      if (value !== undefined) {
        formattedValue = String(value);
      }
      break;
    case 'date':
      if (value && moment.isMoment(value)) {
        formattedValue = value.format(clientConfig.dateFormat);
      }
      break;
    case 'datetime':
      if (value && moment.isMoment(value)) {
        formattedValue = value.format(clientConfig.dateTimeFormat);
      }
      break;
    default:
      if (isString(value)) {
        formattedValue = $filter('linkify')(value);
      }
      break;
  }

  return formattedValue;
}

function GridRenderer(clientConfig) {
  return {
    restrict: 'E',
    scope: {
      queryResult: '=',
      itemsPerPage: '=',
    },
    template,
    replace: false,
    controller($scope, $filter) {
      $scope.gridColumns = [];
      $scope.gridRows = [];

      $scope.$watch('queryResult && queryResult.getData()', (queryResult) => {
        if (!queryResult) {
          return;
        }

        if ($scope.queryResult.getData() == null) {
          $scope.gridColumns = [];
          $scope.filters = [];
        } else {
          /* BUILDING TOTALS */
          const totals = [];
          $scope.queryResult.getData().forEach((row) => {
            Object.keys(row).forEach((index) => {
              if (row[index]) {
                const value = replaceAll(row[index], ',', '');
                if (!isNaN(value)) {
                  if (!totals[index]) {
                    totals[index] = Number(value);
                  } else {
                    totals[index] += Number(value);
                  }
                }
              }
            });
          });

          $scope.filters = $scope.queryResult.getFilters();
          const columns = $scope.queryResult.getColumns();


          $scope.gridRows = $scope.queryResult.getData();
          let rows = $scope.gridRows;
          columns.forEach(col => formatExtraCols(col, $filter, clientConfig, totals, rows));
          $scope.gridColumns = columns;



        }
      });
    },
  };
}


function formatExtraCols(col, $filter, clientConfig, totals, rows) {
  col.title = getColumnCleanName(col.name);
  col.formatFunction = partial(formatValue, $filter, clientConfig, _, col.type);
  const formulas = {
    'Total Spend (€)': numberFormat(totals['Total Spend (€)'], 2),
    'Total Subscriptions': totals['Total Subscriptions'],
    'Total Impressions': numberFormat(totals['Total Impressions']),
    'Total Clicks': numberFormat(totals['Total Clicks']),
    'SAC (€/Sub)': (numberFormat(totals['Total Spend (€)'])) && (totals['Total Subscriptions']) ? numberFormat(totals['Total Spend (€)'] / totals['Total Subscriptions'], 2) : numberFormat(totals['SAC (€/Sub)'] * 100, 2),
    'CTR( %)': totals['Total Clicks'] && totals['Total Impressions'] ? numberFormat(totals['Total Clicks'] / totals['Total Impressions'] * 100, 2) : numberFormat(totals['CTR( %)'] * 100, 2),
    'CVR(%)': totals['Total Subscriptions'] && totals['Total Clicks'] || totals['Subscriptions'] && totals['Sessions'] ? numberFormat(totals['Total Subscriptions'] / totals['Total Clicks'] * 100, 2) || numberFormat(totals['Subscriptions'] / totals['Sessions'] * 100, 2) : numberFormat(totals['CVR%'] * 100, 2),
    'CPC(€)': totals['Total Spend (€)'] && totals['Total Clicks'] ? numberFormat(totals['Total Spend (€)'] / totals['Total Clicks'], 2) : numberFormat(totals['CPC(€)'], 2),
    'CPM (€)': totals['Total Spend (€)'] && totals['Total Impressions'] ? numberFormat((totals['Total Spend (€)']) / (totals['Total Impressions']) * 1000, 2) : numberFormat(totals['CPM (€)'], 2),
    'Avg Position': numberFormat(totals['Avg Position'] / numberFormat(rows.length), 2)
  };

  if (col.name != 'Date') {
    col.footer = formulas[col.name] ? formulas[col.name] : numberFormat(totals[col.name]);
  }


}



export default function init(ngModule) {
  ngModule.config((VisualizationProvider) => {
    VisualizationProvider.registerVisualization({
      type: 'TABLE',
      name: 'Table',
      renderTemplate: '<grid-renderer options="visualization.options" query-result="queryResult"></grid-renderer>',
      skipTypes: true,
    });
  });
  ngModule.directive('gridRenderer', GridRenderer);
}
