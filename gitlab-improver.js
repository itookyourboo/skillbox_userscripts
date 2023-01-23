// ==UserScript==
// @name         GitLabImprover
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Прокачка GitLab для проверяющих преподавателей
// @author       wignorbo
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @require      https://raw.githubusercontent.com/jeresig/jquery.hotkeys/master/jquery.hotkeys.js
// @require      https://gist.githubusercontent.com/BrockA/2625891/raw/9c97aa67ff9c5d56be34a55ad6c18a314e5eb548/waitForKeyElements.js
// @match        https://gitlab.skillbox.ru/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gitlab.com
// @grant        none
// ==/UserScript==

// Список работающих расширений.
function getRunningAddons() {
    return [
        new MergeRequestShortcuts(),
        new DisableEmojis()
    ];
}

class Addon {
    name = "";
    run() {};
}

class MergeRequestShortcuts extends Addon {
    name = "Горячие клавиши для окна Merge Request";

    run() {
        const CLICK_MERGE_SHORTCUT = "alt+m"
        // Панель обзора
        const CLICK_OVERVIEW_SHORTCUT = "alt+o";
        // Панель изменений
        const CLICK_CHANGES_SHORTCUT = "alt+c";
        // Submit review
        const CLICK_SUBMIT_REVIEW = "alt+s";

        const MERGE_SELECTOR = ".btn.accept-merge-request.btn-confirm";
        const OVERVIEW_SELECTOR = "a[data-action='show']";
        const CHANGES_SELECTOR = "a[data-action='diffs']";
        const SUBMIT_SELECTOR = "button[data-qa-selector='submit_review_button']";

        $(document).bind("keyup", CLICK_MERGE_SHORTCUT, function() {
            $(MERGE_SELECTOR).first().click();
        });
        $(document).bind("keyup", CLICK_OVERVIEW_SHORTCUT, function() {
            window.location.href = $(OVERVIEW_SELECTOR).attr("href");
        });
        $(document).bind("keyup", CLICK_CHANGES_SHORTCUT, function() {
            window.location.href = $(CHANGES_SELECTOR).attr("href");
        });
        $(document).bind("keyup", CLICK_SUBMIT_REVIEW, function() {
            $(SUBMIT_SELECTOR).first().click();
        });
    }
}

class DisableEmojis extends Addon {
    name = "Скрытие всплывающего окна со смайликами при написании ':'";

    run() {
        const CONTAINER_SELECTOR = ".atwho-container";

        waitForKeyElements(CONTAINER_SELECTOR, function(node) {
            node.remove();
        });
    }
}

function runAddons() {
    for (let addon of getRunningAddons()) {
        console.debug("[GitLabImprover] Запуск > " + addon.name);
        addon.run();
    }
}

runAddons();
