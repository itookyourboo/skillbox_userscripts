// ==UserScript==
// @name         SkillboxImprover
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Прокачка LMS Skillbox для проверяющих преподавателей
// @author       wignorbo
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @require      https://raw.githubusercontent.com/jeresig/jquery.hotkeys/master/jquery.hotkeys.js
// @require      https://gist.githubusercontent.com/BrockA/2625891/raw/9c97aa67ff9c5d56be34a55ad6c18a314e5eb548/waitForKeyElements.js
// @match        https://go.skillbox.ru/homeworks/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=skillbox.ru
// @grant        none
// ==/UserScript==


// Список работающих расширений.
function getRunningAddons() {
    return [
        new VerdictShortcuts(),
        new InputAutofocus(),
        new GoToTheFirstHomeworkShortcuts(),
        new HideEmptyCourses(),
        new OpenHomeworkLinkShortcuts(),
        new ExpandCoursesShortcuts(),
        // закомментируйте, если что-то не нужно
    ];
}

class Addon {
    name = "";
    run() {};
}

class VerdictShortcuts extends Addon {
    name = "Горячие клавиши для принятия и отлонения работы";

    run() {
        // Отклонение работы: Ctrl+shift+enter
        const DECLINE_SHORTCUT = "ctrl+shift+return";
        // Принятие работы: Ctrl+enter
        const ACCEPT_SHORTCUT = "ctrl+return";

        // Селектор кнопки "Отклонить"
        const DECLINE_BUTTON_SELECTOR = ".comments-teacher__button.danger";
        // Селектор кнопки "Принять"
        const ACCEPT_BUTTON_SELECTOR = ".comments-teacher__button.success";

        $(document).bind("keyup", DECLINE_SHORTCUT, function() {
            if (!WindowManager.isHomeworkPage()) return;
            WindowManager.closeWindow();
            $(DECLINE_BUTTON_SELECTOR).first().click();
        });
        $(document).bind("keyup", ACCEPT_SHORTCUT, function() {
            if (!WindowManager.isHomeworkPage()) return;
            WindowManager.closeWindow();
            $(ACCEPT_BUTTON_SELECTOR).first().click();
            setTimeout(function() {
                window.history.go(-1); // для возврата на страницу проверок
            }, 250);
        });

        jQuery.hotkeys.options.filterContentEditable = false;
    }
}

class InputAutofocus extends Addon {
    name = "Фокус на поле ввода при переходе на страницу домашней работы";

    run() {
        // Селектор окошка ввода текста
        const INPUT_SELECTOR = ".fr-element.fr-view";

        waitForKeyElements(INPUT_SELECTOR, function(node) {
            if (!WindowManager.isHomeworkPage()) return;
            WindowManager.focusInputField();
        });
    }
}

class GoToTheFirstHomeworkShortcuts extends Addon {
    name = "Горячая клавиша для перехода на первую домашнюю работу в главном меню"

    run() {
        // Ctrl+Right
        const HOMEWORK_CARD_GO_SHORTCUT = "ctrl+right";
        // Селектор карточки домашней работы в главном меню
        const HOMEWORK_CARD_SELECTOR = ".homework-card__link";

        $(document).bind("keyup", HOMEWORK_CARD_GO_SHORTCUT, function() {
            if (!WindowManager.isMainPage()) return;
            var hwCard = $(HOMEWORK_CARD_SELECTOR).first();
            window.location.href = hwCard.attr("href");
        });
    }
}

class HideEmptyCourses extends Addon {
    name = "Скрыть курсы без работ"

    run() {
        // Селектор элемента, который показывает, есть ли работы
        const EMPTY_COURSE_SELECTOR = ".item__empty.ng-star-inserted";
        // Селектор аккордеона
        const ACCORDION_SELECTOR = ".homeworks__accordion"

        waitForKeyElements(EMPTY_COURSE_SELECTOR, function(node) {
            node.parents(ACCORDION_SELECTOR).hide();
        });
    }
}

class OpenHomeworkLinkShortcuts extends Addon {
    name = "Горячая клавиша для перехода по ссылке на работу"

    run() {
        // Alt+L
        const OPEN_LINK_SHORTCUT = "alt+l";
        // Селектор ссылки
        const LINK_SELECTOR = "app-comment-item a";
        // Селектор кнопки GitLab
        const GITLAB_BUTTON_SELECTOR = "a.gitlab-button";

        $(document).bind("keyup", OPEN_LINK_SHORTCUT, function() {
            if (!WindowManager.isHomeworkPage()) return;
            var url = (
                $(LINK_SELECTOR).attr("href") ||
                $(GITLAB_BUTTON_SELECTOR).attr("href")
            );
            if (!url) return;
            WindowManager.openWindow(url);
            WindowManager.focusInputField();
        });
    }
}

class ExpandCoursesShortcuts extends Addon {
    name = "Горячие клавиши для скрытия/показа курсов";

    run() {
        // Селектор нескрытых аккордеонов
        const VISIBLE_ACCORDION_SELECTOR = "app-sb-accordion-panel:visible";
        // Селектор раскрытого аккордеона
        const EXPANDED_ACCORDION_SELECTOR = ".expanded";
        // Селектор кликабельного заголовка аккордеона
        const ACCORDION_HEADER_SELECTOR = "app-sb-accordion-panel-header";

        // Раскрыть предыдущий курс: Alt+Up
        const EXPAND_PREVIOUS_SHORTCUT = "alt+up";
        // Раскрыть следующий курс: Alt+Down
        const EXPAND_NEXT_SHORTCUT = "alt+down";

        $(document).bind("keyup", EXPAND_PREVIOUS_SHORTCUT, function() { expand(-1); });
        $(document).bind("keyup", EXPAND_NEXT_SHORTCUT, function() { expand(+1); });

        function mod(n, m) { return ((n + m) + m) % m; }

        function expand(offset) {
            if (!WindowManager.isMainPage()) return;

            var panels = $(VISIBLE_ACCORDION_SELECTOR);
            var currentExpandedPanel = panels.closest(EXPANDED_ACCORDION_SELECTOR);
            var currentExpandedIndex = panels.index(currentExpandedPanel);
            if (currentExpandedIndex === -1 && offset == -1) currentExpandedIndex = 0;
            var currentPanel = panels.eq(mod(currentExpandedIndex + offset, panels.length));
            currentPanel.find(ACCORDION_HEADER_SELECTOR).first().click();
        }
    }
}

class WindowManager {
    static #openedWindow;

    static getWindowFeatures() {
        const SCREEN_WIDTH = window.screen.width;
        const SCREEN_HEIGHT = window.screen.height;
        return `
        toolbar=yes,
        top=0,
        left=${SCREEN_WIDTH / 2},
        width=${SCREEN_WIDTH / 2},
        height=${SCREEN_HEIGHT}
        `;
    }

    static getTarget() {
        return "_blank";
    }

    static openWindow(url) {
        this.#openedWindow = window.open(url, this.getTarget(), this.getWindowFeatures());
    }

    static closeWindow() {
        if (this.#openedWindow) {
            this.#openedWindow.close();
            this.#openedWindow = undefined;
        }
    }

    static isMainPage() { return window.location.href.includes("next"); }
    static isHomeworkPage() { return !this.isMainPage(); }
    static focusInputField() {
        const INPUT_FIELD_SELECTOR = ".fr-element.fr-view";
        $(INPUT_FIELD_SELECTOR).first().focus();
    }
}

function runAddons() {
    for (let addon of getRunningAddons()) {
        console.debug("[SkillboxImprover] Запуск > " + addon.name);
        addon.run();
    }
}

runAddons();