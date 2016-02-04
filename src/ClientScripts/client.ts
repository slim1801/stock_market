/// <reference path="../typings/knockout.d.ts" />

declare var io: any;
declare var $: any;

interface KnockoutBindingHandlers {
    virtual_window_drag: KnockoutBindingHandler;
    virtual_window_drop: KnockoutBindingHandler;
}

module Client {
    
    export class StockViewModel {

        quantity: KnockoutObservable<number> = ko.observable(0);

        bid_price: KnockoutObservable<number> = ko.observable(0);
        ask_price: KnockoutObservable<number> = ko.observable(0);
        
        prev_bid_price: KnockoutObservable<number> = ko.observable(0);
        prev_ask_price: KnockoutObservable<number> = ko.observable(0);

        code: KnockoutObservable<string> = ko.observable("");

        popped: KnockoutObservable<boolean> = ko.observable(false);

        bid_price_formatted: KnockoutComputed<string> = ko.pureComputed(() => {
            return "$" + this.bid_price().toFixed(2);
        });
        ask_price_formatted: KnockoutComputed<string> = ko.pureComputed(() => {
            return "$" + this.ask_price().toFixed(2);
        });
        bid_movement: KnockoutComputed<string> = ko.pureComputed(() => {
            return this.movement(this.bid_price(), this.prev_bid_price());
        });
        ask_movement: KnockoutComputed<string> = ko.pureComputed(() => {
            return this.movement(this.ask_price(), this.prev_ask_price());
        });
        bid_movement_color: KnockoutComputed<string> = ko.pureComputed(() => {
            return this.movement_color(this.bid_price(), this.prev_bid_price());
        });
        ask_movement_color: KnockoutComputed<string> = ko.pureComputed(() => {
            return this.movement_color(this.ask_price(), this.prev_ask_price());
        });
        
        movement(price: number, prev_price: number) {
            if          (price > prev_price)        return "up";
            else if     (price == prev_price)       return "level"
            else                                    return "down"
        }
        
        movement_color (price: number, prev_price: number) {
            if          (price > prev_price)        return "green"
            else if     (price == prev_price)       return "blue"
            else                                    return "red"
        }

        populate_values(data): StockViewModel {
            this.bid_price(data._bid);
            this.ask_price(data._ask);
            this.code(data._code);
            return this;
        }
    }
    
    /*
    * Draggable Windows
    */
    export class VirtualWindow {

        quantity: KnockoutObservable<number> = ko.observable(0);
        dragged:  KnockoutObservable<boolean> =  ko.observable(false);
        security: StockViewModel;
        
        top: KnockoutObservable<number> = ko.observable(0);
        left: KnockoutObservable<number> = ko.observable(0);
        width: KnockoutObservable<number> = ko.observable(0);
        height: KnockoutObservable<number> = ko.observable(0);
        z_index: KnockoutObservable<number> = ko.observable(0);

        constructor(data: StockViewModel) {
            this.security = data;
        }
        
        re_position(top: number, left: number) {
            this.top(top);
            this.left(left);
        }
        
        bring_to_front (v_window, v_windows) {
            v_window.z_index(1);
            v_windows().forEach( (window) => {
                if (v_window == window) {
                    window.z_index(1);
                }
                else {
                    window.z_index(0);
                }
            });
        }
    }
    
    export class Modal {
        operation: KnockoutObservable<string> = ko.observable("");
        security: StockViewModel;
        
        total_price: KnockoutObservable<string> = ko.pureComputed(() => {
            var price = null;
            if        (this.operation() == "Buy")         price = this.security.bid_price();
            else if   (this.operation() == "Sell")        price = this.security.ask_price();
            
            return "$" + ko.observable(price * this.security.quantity())().toFixed(2);
        });

        constructor(operation: string, data: StockViewModel) {
            this.operation(operation);
            this.security = data;
        }
    }

    export class StockListViewModel {

        companies = ko.observableArray([]);
        amount_of_securities: KnockoutObservable<number> = ko.observable(0);
        modal: KnockoutObservable<Modal> = ko.observable(new Modal("", new StockViewModel()));
        pop_windows: KnockoutObservableArray<VirtualWindow> = ko.observableArray([]);

        column_titles = ko.observableArray([
            { "title": "Code" },
            { "title": "Bid" },
            { "title": "Ask" },
            { "title": "Operation" }
        ]);

        updateCompanies(updated_company_stock) {

            var stock: StockViewModel = ko.utils.arrayFirst(this.companies(), (obj) => {
                return updated_company_stock._code == obj.code();
            });

            if (stock == null) {
                this.companies.unshift((new StockViewModel()).populate_values(updated_company_stock));
            }
            else {
                stock.prev_bid_price(stock.bid_price())
                stock.prev_ask_price(stock.ask_price());
                
                stock.bid_price(updated_company_stock._bid);
                stock.ask_price(updated_company_stock._ask);
            }
        }
        /*
         * The arrow notation tells typescript to use this classes context
         * "this." references this class instead of the JavaScript function that it is compiled to
         */
        buy = (data: StockViewModel, event) => {
            this.modal(new Modal("Buy", data));
        }

        sell = (data: StockViewModel, event) => {
            this.modal(new Modal("Sell", data));
        }

        pop = (data: StockViewModel, event) => {
            
            var window = ko.utils.arrayFirst(this.pop_windows(), (window) => {
                return data.code() == window.security.code();
            });
            if (window == null) {
                this.pop_windows.unshift(new VirtualWindow(data));
                data.popped(true);
            }
        }

        close_window = (data: VirtualWindow, event) => {
            
            this.pop_windows.remove((window) => {
                return window.security.code() == data.security.code();
            })
            .forEach((window) => {
                window.security.popped(false);
            });
            
            ko.utils.arrayFilter(this.pop_windows(), (window: VirtualWindow) => {
                return !window.dragged();
            })
            .reverse()
            .forEach( (window: VirtualWindow, index) => {
                window.re_position((window.height() + 15) * Math.floor(index / 2), (window.width() + 15) * Math.floor(index % 2));
            });
        }
        
        re_position = (element, data) => {
            var div = $(element[1]);
            
            var num_undragged = ko.utils.arrayFilter<VirtualWindow>( this.pop_windows(), (window: VirtualWindow) => { return !window.dragged() } ).length;
            
            data.width(parseInt(div.css('width')));
            data.height(parseInt(div.css('height')));
            
            var pop_window_length =       (num_undragged - 1);
            var column: number =          Math.floor(pop_window_length % 2);
            var row: number =             Math.floor(pop_window_length / 2);
            
            data.top((data.height() + 15) * row);
            data.left((data.width() + 15) * column);
        }

        buy_stock_modal(data) {
            if (data.operation() == 'Sell') {
                alert("Congratulations! You have sold " + data.security.quantity() + " at " + data.security.ask_price_formatted() + " for a total of " + data.total_price());
            }
            else if (data.operation() == 'Buy') {
                alert("Congratulations! You have bought " + data.security.quantity() + " at " + data.security.bid_price_formatted() + " for a total of " + data.total_price());
            }
            $('#stockModal').modal('toggle');
        }
    }

    ko.bindingHandlers.virtual_window_drag = {
        init: (element, valueAccessor, allBindingsAccessor, viewModel) => {
            var dragElement = $(element);
            var dragOptions = {
                containment: valueAccessor().containment,
                start: (event, ui) => {
                    var v_window: VirtualWindow =       ko.utils.unwrapObservable(valueAccessor().window);
                    var v_windows =                     ko.utils.unwrapObservable(valueAccessor().windows);
                    
                    v_window.z_index(1);
                    v_windows.forEach( (window) => {
                        if      (v_window == window)    window.z_index(1);
                        else                            window.z_index(0);
                    });
                    
                    if (!v_window.dragged()) {
                        v_window.dragged(true);
                        ko.utils.arrayFilter(v_windows, (window: VirtualWindow) => {
                            return !window.dragged();
                        })
                        .reverse()
                        .forEach( (window: VirtualWindow, index) => {
                            window.re_position((window.height() + 15) * Math.floor(index / 2), (window.width() + 15) * Math.floor(index % 2));
                        });
                    }
                },
                stop: (event, ui) => {
                    var v_window: VirtualWindow =       ko.utils.unwrapObservable(valueAccessor().window);
                    var v_windows =                     ko.utils.unwrapObservable(valueAccessor().windows);
                    
                    v_window.re_position(
                        parseInt(dragElement.css("top")),
                        parseInt(dragElement.css("left"))
                    );
                },
                cursor: 'default'
                };
            
            dragElement.draggable(dragOptions).disableSelection();
    }
    };

}

var stock_view_model: Client.StockListViewModel = new Client.StockListViewModel();

var socket = io.connect();
socket.on("update", function(data) {
	stock_view_model.updateCompanies(data);
});

ko.applyBindings(stock_view_model);



