/// <reference path="../typings/knockout.d.ts" />
var Client;
(function (Client) {
    var StockViewModel = (function () {
        function StockViewModel() {
            var _this = this;
            this.quantity = ko.observable(0);
            this.bid_price = ko.observable(0);
            this.ask_price = ko.observable(0);
            this.prev_bid_price = ko.observable(0);
            this.prev_ask_price = ko.observable(0);
            this.code = ko.observable("");
            this.popped = ko.observable(false);
            this.bid_price_formatted = ko.pureComputed(function () {
                return "$" + _this.bid_price().toFixed(2);
            });
            this.ask_price_formatted = ko.pureComputed(function () {
                return "$" + _this.ask_price().toFixed(2);
            });
            this.bid_movement = ko.pureComputed(function () {
                return _this.movement(_this.bid_price(), _this.prev_bid_price());
            });
            this.ask_movement = ko.pureComputed(function () {
                return _this.movement(_this.ask_price(), _this.prev_ask_price());
            });
            this.bid_movement_color = ko.pureComputed(function () {
                return _this.movement_color(_this.bid_price(), _this.prev_bid_price());
            });
            this.ask_movement_color = ko.pureComputed(function () {
                return _this.movement_color(_this.ask_price(), _this.prev_ask_price());
            });
        }
        StockViewModel.prototype.movement = function (price, prev_price) {
            if (price > prev_price)
                return "up";
            else if (price == prev_price)
                return "level";
            else
                return "down";
        };
        StockViewModel.prototype.movement_color = function (price, prev_price) {
            if (price > prev_price)
                return "green";
            else if (price == prev_price)
                return "blue";
            else
                return "red";
        };
        StockViewModel.prototype.populate_values = function (data) {
            this.bid_price(data._bid);
            this.ask_price(data._ask);
            this.code(data._code);
            return this;
        };
        return StockViewModel;
    })();
    Client.StockViewModel = StockViewModel;
    /*
    * Draggable Windows
    */
    var VirtualWindow = (function () {
        function VirtualWindow(data) {
            this.quantity = ko.observable(0);
            this.dragged = ko.observable(false);
            this.top = ko.observable(0);
            this.left = ko.observable(0);
            this.width = ko.observable(0);
            this.height = ko.observable(0);
            this.z_index = ko.observable(0);
            this.security = data;
        }
        VirtualWindow.prototype.re_position = function (top, left) {
            this.top(top);
            this.left(left);
        };
        VirtualWindow.prototype.bring_to_front = function (v_window, v_windows) {
            v_window.z_index(1);
            v_windows().forEach(function (window) {
                if (v_window == window) {
                    window.z_index(1);
                }
                else {
                    window.z_index(0);
                }
            });
        };
        return VirtualWindow;
    })();
    Client.VirtualWindow = VirtualWindow;
    var Modal = (function () {
        function Modal(operation, data) {
            var _this = this;
            this.operation = ko.observable("");
            this.total_price = ko.pureComputed(function () {
                var price = null;
                if (_this.operation() == "Buy")
                    price = _this.security.bid_price();
                else if (_this.operation() == "Sell")
                    price = _this.security.ask_price();
                return "$" + ko.observable(price * _this.security.quantity())().toFixed(2);
            });
            this.operation(operation);
            this.security = data;
        }
        return Modal;
    })();
    Client.Modal = Modal;
    var StockListViewModel = (function () {
        function StockListViewModel() {
            var _this = this;
            this.companies = ko.observableArray([]);
            this.amount_of_securities = ko.observable(0);
            this.modal = ko.observable(new Modal("", new StockViewModel()));
            this.pop_windows = ko.observableArray([]);
            this.column_titles = ko.observableArray([
                { "title": "Code" },
                { "title": "Bid" },
                { "title": "Ask" },
                { "title": "Operation" }
            ]);
            /*
             * The arrow notation tells typescript to use this classes context
             * "this." references this class instead of the JavaScript function that it is compiled to
             */
            this.buy = function (data, event) {
                _this.modal(new Modal("Buy", data));
            };
            this.sell = function (data, event) {
                _this.modal(new Modal("Sell", data));
            };
            this.pop = function (data, event) {
                var window = ko.utils.arrayFirst(_this.pop_windows(), function (window) {
                    return data.code() == window.security.code();
                });
                if (window == null) {
                    _this.pop_windows.unshift(new VirtualWindow(data));
                    data.popped(true);
                }
            };
            this.close_window = function (data, event) {
                _this.pop_windows.remove(function (window) {
                    return window.security.code() == data.security.code();
                })
                    .forEach(function (window) {
                    window.security.popped(false);
                });
                ko.utils.arrayFilter(_this.pop_windows(), function (window) {
                    return !window.dragged();
                })
                    .reverse()
                    .forEach(function (window, index) {
                    window.re_position((window.height() + 15) * Math.floor(index / 2), (window.width() + 15) * Math.floor(index % 2));
                });
            };
            this.re_position = function (element, data) {
                var div = $(element[1]);
                var num_undragged = ko.utils.arrayFilter(_this.pop_windows(), function (window) { return !window.dragged(); }).length;
                data.width(parseInt(div.css('width')));
                data.height(parseInt(div.css('height')));
                var pop_window_length = (num_undragged - 1);
                var column = Math.floor(pop_window_length % 2);
                var row = Math.floor(pop_window_length / 2);
                data.top((data.height() + 15) * row);
                data.left((data.width() + 15) * column);
            };
        }
        StockListViewModel.prototype.updateCompanies = function (updated_company_stock) {
            var stock = ko.utils.arrayFirst(this.companies(), function (obj) {
                return updated_company_stock._code == obj.code();
            });
            if (stock == null) {
                this.companies.unshift((new StockViewModel()).populate_values(updated_company_stock));
            }
            else {
                stock.prev_bid_price(stock.bid_price());
                stock.prev_ask_price(stock.ask_price());
                stock.bid_price(updated_company_stock._bid);
                stock.ask_price(updated_company_stock._ask);
            }
        };
        StockListViewModel.prototype.buy_stock_modal = function (data) {
            if (data.operation() == 'Sell') {
                alert("Congratulations! You have sold " + data.security.quantity() + " at " + data.security.ask_price_formatted() + " for a total of " + data.total_price());
            }
            else if (data.operation() == 'Buy') {
                alert("Congratulations! You have bought " + data.security.quantity() + " at " + data.security.bid_price_formatted() + " for a total of " + data.total_price());
            }
            $('#stockModal').modal('toggle');
        };
        return StockListViewModel;
    })();
    Client.StockListViewModel = StockListViewModel;
    ko.bindingHandlers.virtual_window_drag = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var dragElement = $(element);
            var dragOptions = {
                containment: valueAccessor().containment,
                start: function (event, ui) {
                    var v_window = ko.utils.unwrapObservable(valueAccessor().window);
                    var v_windows = ko.utils.unwrapObservable(valueAccessor().windows);
                    v_window.z_index(1);
                    v_windows.forEach(function (window) {
                        if (v_window == window)
                            window.z_index(1);
                        else
                            window.z_index(0);
                    });
                    if (!v_window.dragged()) {
                        v_window.dragged(true);
                        ko.utils.arrayFilter(v_windows, function (window) {
                            return !window.dragged();
                        })
                            .reverse()
                            .forEach(function (window, index) {
                            window.re_position((window.height() + 15) * Math.floor(index / 2), (window.width() + 15) * Math.floor(index % 2));
                        });
                    }
                },
                stop: function (event, ui) {
                    var v_window = ko.utils.unwrapObservable(valueAccessor().window);
                    var v_windows = ko.utils.unwrapObservable(valueAccessor().windows);
                    v_window.re_position(parseInt(dragElement.css("top")), parseInt(dragElement.css("left")));
                },
                cursor: 'default'
            };
            dragElement.draggable(dragOptions).disableSelection();
        }
    };
})(Client || (Client = {}));
var stock_view_model = new Client.StockListViewModel();
var socket = io.connect();
socket.on("update", function (data) {
    stock_view_model.updateCompanies(data);
});
ko.applyBindings(stock_view_model);
