// Authors:
// * Baptiste Saleil http://bsaleil.org/
// * Community: https://github.com/bsaleil/todolist-gnome-shell-extension/network
// With code from: https://github.com/vibou/vibou.gTile
//
// Licence: GPLv2+
const Main = imports.ui.main;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const todo_list = Extension.imports.gui_elements.todolist_display;
const initTranslations = Extension.imports.utils.initTranslations;

let todolist;   // Todolist instance
let meta;

// Init function
function init(metadata) 
{       
    meta = metadata;
    initTranslations("todolist");
}

function enable()
{
    todolist = new todo_list.TodoList(meta);
    todolist._enable();
    Main.panel.addToStatusArea('todolist_sec', todolist);
}

function disable()
{
    todolist._disable();
    todolist.destroy();
    todolist = null;
}

//----------------------------------------------------------------------
