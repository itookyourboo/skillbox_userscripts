// ==UserScript==
// @name         SkillboxImprover
// @namespace    http://tampermonkey.net/
// @version      1.0.1
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
        new SingleFeed(),
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

class SingleFeed extends Addon {
    name = "Единая лента для всех работ"
    run() {
        const HOMEWORKS_BODY_SELECTOR = ".homeworks__body";
        const CUSTOM_HOMEWORKS = "custom_homeworks";

        function getAuthHeader() {
            return "Bearer " + localStorage.getItem("x-access-token");
        }

        function _fetch(url) {
            return fetch(url, {
                headers: {
                    "X-Auth": getAuthHeader(),
                }
            }).then(response => response.json());
        }

        function fillZeros(number, pad) {
            return (number + Math.pow(10, pad)).toString().slice(-pad);
        }

        function compareWorks(work1, work2) {
            return work1.status_updated_at.localeCompare(work2.status_updated_at);
        }

        function getAllWorks(courses) {
            let promises = [];
            for (let course of courses) {
                let url = `https://go.skillbox.ru/api/v3/teachers/courses/${course.id}/homeworks/?ordering=last_active_at&status=wait`
                let promise = _fetch(url).then(works => {
                    for (let work of works.results) {
                        work.course_name = course.name;
                    }
                    return works;
                });
                promises.push(promise);
            }
            return Promise.all(promises);
        }

        function renderWorks(works) {
            $(HOMEWORKS_BODY_SELECTOR).prepend(`<div class="${CUSTOM_HOMEWORKS} homeworks__col-list ui-sb-col-lg-9"></div>`);
            for (let work of works) {
                let color = work.check_status === "ok" ? "green" : work.check_status === "warning" ? "orange" : "red";

                let date = new Date(work.status_updated_at);
                let card = `<a class="homework-card__link" href="/homeworks/${work.id}" style="color: #000000;">
                <div style="border: 1px solid #000000; padding: 15px 20px; margin-bottom: 10px; border-radius: 15px;">
                <p>
                <span style="font-weight: 500;">
                ${work.course_name}
                </span>
                <br>
                ${work.topic.number}. ${work.topic.name}
                </p>
                <p style="font-weight: 500; margin: 0px;">
                <span style="color: ${color}">
                ${fillZeros(date.getDate(), 2)}.${fillZeros(date.getMonth() + 1, 2)}
                ${fillZeros(date.getHours(), 2)}:${fillZeros(date.getMinutes(), 2)}
                </span> |
                ${work.user.first_name} ${work.user.last_name}
                </p>
                </div>
                </a>`;

                $(`.${CUSTOM_HOMEWORKS}`).append(card);
            }
        }

        function getAllCourses() {
            const URL = "https://go.skillbox.ru/api/v3/teachers/current/courses/check-statistics/?user_homework_status=wait";
            _fetch(URL).then(getAllWorks).then(data => {
                let works = []
                for (let workCouple of data) {
                    works = [...works, ...workCouple.results];
                }
                works.sort(compareWorks);
                renderWorks(works);
            });
        }

        waitForKeyElements(HOMEWORKS_BODY_SELECTOR, getAllCourses);
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
