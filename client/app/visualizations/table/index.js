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
                    totals[index] = numberFormat(Number(value), 2);
                  } else {
                    totals[index] += numberFormat(Number(value), 2);
                  }
                }
              }
            });
          });



          $scope.filters = $scope.queryResult.getFilters();
          const columns = $scope.queryResult.getColumns();

          columns.forEach((col) => {
            col.title = getColumnCleanName(col.name);
            col.formatFunction = partial(formatValue, $filter, clientConfig, _, col.type);
            switch (col.name) {
              case 'SAC (€/Sub)': col.footer = parseFloat(totals[col.name]) / parseFloat(totals['Total Subscriptions']);
                break;
              case 'CTR( %)': col.footer = parseFloat(totals['Total Clicks']) / parseFloat(totals['Total Impressions']);
                break;
              case 'CVR(%)': col.footer = parseFloat(totals['Total Subscriptions']) / parseFloat(totals['Total Clicks']);
                break;
              case 'CPC(€)': col.footer = parseFloat(totals['Total Spend (€)']) / parseFloat(totals['Total Clicks']);
                break;
              case 'CPM (€)': col.footer = parseFloat(totals['Total Spend (€)']) / parseFloat((totals['Total Impressions'])) / 1000;
                break
              default: col.footer = totals[col.name] ? totals[col.name] : '';
            }
          });

          $scope.gridRows = $scope.queryResult.getData();
          $scope.gridColumns = columns;
        }
      });
    },
  };
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
