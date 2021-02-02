const { ipcRenderer, app } = require('electron');

/*************************************************************************************
 * 
 *                           Дэлгэцтэй харьцах модуль
 * 
 ************************************************************************************/


let uiModule = (function() {
    // 1. DOM элементүүд
    let DOMelements = {
        typeField: ".add__type",
        descriptionField: ".add__description",
        valueField: ".add__value",
        btn: ".add__btn",
        dateSection: ".budget__title--month",
        incomeList: ".income__list",
        expensesList: ".expenses__list",
        budgetSection: ".budget__value",
        incomeValue: ".budget__income--value",
        expenseValue: ".budget__expenses--value",
        totalPercentage: ".budget__expenses--percentage",
        deleteBtn: ".item__delete--btn",
        itemPercentages: ".item__percentage"
    };

    // List-үүдыг callback-аар давтах функц
    function forEachNodeList(list, callback) {
        for(let i=0; i<list.length; i++) {
            callback(list[i], i);
        }
    }

    // Мөнгийг таслал ба тэмдэгтээр форматлах 
    function formatMoney(type, value) {
        value = value + "";
        let x = value.split("").reverse().join("");
        y = "";
        for(let i=0; i<x.length; i++) {
            y = y + x[i];
            if((i+1)%3 === 0) {
                y = y + ",";
            }
        }
        y = y.split("").reverse().join("");
        if(y[0] === ",") y = y.substr(1, y.length-1);
        if(type === "inc") y = "+ " + y;
        else y = "- " + y;
        return y;
    }


    // Буцаах гишүүн функцууд
    return {
        // Он сарыг дэлгэцэнд гаргах функц
        getDate: function() {
            let today = new Date();
            document.querySelector(DOMelements.dateSection).textContent = `${today.getFullYear()} оны ${today.getMonth()} сарын `;
        },

        changeType: function() {
            let fields = document.querySelectorAll(DOMelements.typeField + ", " + DOMelements.descriptionField + ", " + DOMelements.valueField);
            forEachNodeList(fields, function(el) {
                el.classList.toggle("red-focus");
            });
            document.querySelector(DOMelements.btn).classList.toggle("red");
        },

        // DOM элементүүдийг буцаах функц
        getDOMelements: function() {
            return DOMelements;
        },

        // Оролтын талбаруудыг цэвэрлэх, фокус өөрчлөх функц
        clearFields: function() {
            let fields = document.querySelectorAll(DOMelements.descriptionField + ", " + DOMelements.valueField);
            let arr = Array.from(fields);
            arr.forEach(function(el) {
                el.value = "";
            });
            arr[0].focus();
        },

        // Оролтын утгуудыг буцаах функц
        getFieldValues: function() {
            return {
                type: document.querySelector(DOMelements.typeField).value,
                desc: document.querySelector(DOMelements.descriptionField).value,
                value: document.querySelector(DOMelements.valueField).value
            }
        },

        // Орлого/Зарлагын жагсаалтыг дэлгэц дээр нэмж харуулах функц
        addListItem: function(item, type) {
            let html, list;
            if(type === "inc") {
                list = DOMelements.incomeList;
                html = `<div class="item clearfix" id="inc-${item.id}">
                <div class="item__description">${item.desc}</div>
                <div class="right clearfix">
                    <div class="item__value">${formatMoney(type, item.value)}</div>
                    <div class="item__delete">
                        <button class="item__delete--btn"><i class="ion-ios-close-outline"></i></button>
                    </div>
                </div>
            </div>`;
            } else {
                list = DOMelements.expensesList;
                html = `<div class="item clearfix" id="exp-${item.id}">
                <div class="item__description">${item.desc}</div>
                <div class="right clearfix">
                    <div class="item__value">${formatMoney(type, item.value)}</div>
                    <div class="item__percentage">21%</div>
                    <div class="item__delete">
                        <button class="item__delete--btn"><i class="ion-ios-close-outline"></i></button>
                    </div>
                </div>
            </div>`;
            }
            document.querySelector(list).insertAdjacentHTML("beforeend", html);
        },
        // Нийт төсөв, орлого зарлагыг дэлгэцэнд харуулдаг функц
        showBudgets: function(budget) {
            let type;
            if(budget.budget >= 0) type = "inc"; 
            else type = "exp";
            document.querySelector(DOMelements.budgetSection).textContent = formatMoney(type, Math.abs(budget.budget));
            document.querySelector(DOMelements.incomeValue).textContent = formatMoney("inc", budget.totalInc);
            document.querySelector(DOMelements.expenseValue).textContent = formatMoney("exp", budget.totalExp);
            document.querySelector(DOMelements.totalPercentage).textContent = budget.totalPercentage;
        },

        // Зарлагын жагсаалтууд дээр харгалзах хувиудыг тавих функц
        showAllPercentages: function(allPrecentages) {
            let list = document.querySelectorAll(DOMelements.itemPercentages);
            forEachNodeList(list, function(el, idx) {
                el.textContent = allPrecentages[idx] + "%";
            });
        },

        // Орлого зарлагын жагсаалтыг дэлгэцээс олж устгадаг функц
        deleteListItem: function(id) {
            let el = document.getElementById(id);
            el.parentNode.removeChild(el);
        }

    }
})();

/*************************************************************************************
 * 
 *                           Санхүүтэй харьцах модуль
 * 
 ************************************************************************************/

let financeModule = (function() {
    // Хувийн гишүүн өгөгдлүүд
    // Орлогын класс
    class Income {
        constructor(id, desc, value) {
            this.id = id;
            this.desc = desc;
            this.value = value;
        }
    }
    // Зарлагын класс /Хувь тооцох гишүүн функцтэй/
    class Expense {
        constructor(id, desc, value) {
            this.id = id;
            this.desc = desc;
            this.value = value;
            this.percentage = -1;
        }

        calculatePercentage() {
            if(budgetInfos.total.inc ===  0) {
                this.percentage = 0;
            } else {
                this.percentage = Math.round((this.value / budgetInfos.total.inc)*100);
            }
        }

        getPercentage() {
            return this.percentage;
        }
    }
    // Орлого зарлага төсөв, хувийг хадгалдаг дотоод обьект
    let budgetInfos = {
        items: {
            inc: [],
            exp: []
        },
        total: {
            inc: 0,
            exp: 0
        },
        budget: 0,
        totalPercentage: 0
    };
    // Нийт орлого/зарлагын дүнг тооцдог функц
    function calculateItems(type) {
        let sum = 0;
        budgetInfos.items[type].forEach(function(el) {
            sum += el.value;
        });
        budgetInfos.total[type] = sum;
    }
    

    return {
        // Нийт төсвийг болон зарлагын хувийг тооцдог функц
        calculateTotals: function() {
            calculateItems('inc');
            calculateItems('exp');
            budgetInfos.budget = budgetInfos.total.inc - budgetInfos.total.exp;
            if(budgetInfos.total.exp > 0) {
                if(budgetInfos.total.inc === 0) {
                    budgetInfos.totalPercentage = 0;
                } else {
                    budgetInfos.totalPercentage = Math.round((budgetInfos.total.exp / budgetInfos.total.inc)*100) + "%";   
                }
            } else {
                budgetInfos.totalPercentage = 0;
            }
        },
        // Зарлага болгоны хувийг бодох гишүүн функцийг дууддаг функц
        calculatePercentages: function() {
            budgetInfos.items.exp.forEach(function(el) {
                el.calculatePercentage();
            });
        },
        // Зарлага болгоны хувийг буцаадаг функц
        getPercentages: function() {
            let allPercentages = budgetInfos.items.exp.map(function(el) {
                return el.getPercentage();
            });
            return allPercentages;
        },

        // Төсвийн мэдээллүүдийг обьектоор буцаадаг функц
        getBudgets: function() {
            return {
                totalInc: budgetInfos.total.inc,
                totalExp: budgetInfos.total.exp,
                budget: budgetInfos.budget,
                totalPercentage: budgetInfos.totalPercentage
            }
        },

        // Төсвийн мэдээллээс элементийг устгах функц
        deleteItems: function(id, type) {
            let ids = budgetInfos.items[type].map(function(el) {
                return el.id;
            });
            let index = ids.indexOf(id);
            budgetInfos.items[type].splice(index, 1);
        },

        // Төсвийн мэдээлэл дэрээ элемент нэмэх функц
        addItems: function(type, desc, value) {
            let item, id;
            if(budgetInfos.items[type].length === 0) {
                id = 1;
            } else {
                id = budgetInfos.items[type][budgetInfos.items[type].length-1].id + 1;
            }
            if(type === "inc") {
                item = new Income(id, desc, parseInt(value));
            } else {
                item = new Expense(id, desc, parseInt(value));
            }
            budgetInfos.items[type].push(item);
            calculateItems(type);
            return item;
        }
    }
})();

/*************************************************************************************
 * 
 *                           Холбогч харьцах модуль
 * 
 ************************************************************************************/

let appModule = (function(uiModule, financeModule) {
    // Талбаруудад оруулсан утгуудыг санхүүгийн төсвийн мэдээлэл дээр, дэлгэц дээр тус тус нэмдэг функц
    function addItems() {
        let fieldValues = uiModule.getFieldValues();
        console.log(fieldValues);
        uiModule.clearFields();
        let item = financeModule.addItems(fieldValues.type, fieldValues.desc, fieldValues.value);
        uiModule.addListItem(item, fieldValues.type);
        updateBudget();
    }

    function updateBudget() {
        financeModule.calculateTotals();
        let budgets = financeModule.getBudgets();
        uiModule.showBudgets(budgets);
        financeModule.calculatePercentages();
        let allPercentages = financeModule.getPercentages();
        console.log(allPercentages);
        uiModule.showAllPercentages(allPercentages);
    }

    function deleteLists(id) {
                uiModule.deleteListItem(id);
                let arr = id.split("-");
                let type = arr[0];
                let parsedId = parseInt(arr[1]);
                financeModule.deleteItems(parsedId, type);
                updateBudget();
    }

    // Бүх эвент листенерүүдыг дууддаг функц
    function setUpEventListeners() {
        let DOM = uiModule.getDOMelements();
        document.querySelector(DOM.btn).addEventListener('click', function() {
            addItems();
        });
        document.addEventListener("keypress", function(e) {
            if(e.keyCode === 13 || e.which === 13) {
                addItems();
            }
        })

        document.querySelector(DOM.incomeList).addEventListener("click", function(e) {
            let id = e.target.parentNode.parentNode.parentNode.parentNode.id;
            if(id) {
                deleteLists(id);
            }
        });
        document.querySelector(DOM.expensesList).addEventListener("click", function(e) {
            let id = e.target.parentNode.parentNode.parentNode.parentNode.id;
            if(id) {
                deleteLists(id);
            }
        });
        document.querySelector(DOM.typeField).addEventListener('change', uiModule.changeType);
        
    }
    // Буцаах гишүүн функцууд
    return {
    // Аппын үндсэн ажиллагааг эхлүүлэх буюу он сарыг хэвлэх функцыг дуудаж, дэлгэцэнд гарах элементүүдыг тэгэлж, эвент листенерүүдыг дууддаг функцыг дуудна.
        init: function() {
            uiModule.getDate();
            uiModule.showBudgets({
                totalInc: 0,
                totalExp: 0,
                budget: 0,
                totalPercentage: 0
            });
            setUpEventListeners();
        }
    }
})(uiModule, financeModule);

appModule.init();