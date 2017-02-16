
const PopupMenu = imports.ui.popupMenu;
const ModalDialog = imports.ui.modalDialog;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Shell = imports.gi.Shell;
const Lang = imports.lang;
const St = imports.gi.St;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const TaskItem = Extension.imports.gui_elements.task_item;
const EntryItem = Extension.imports.gui_elements.entry_item.EntryItem;
const RenameDialog = Extension.imports.gui_elements.rename_dialog.RenameDialog;
const debug = Extension.imports.utils.debug;

const Gettext = imports.gettext.domain('todolist');
const _ = Gettext.gettext;

const BASE_TASKS = "";
const KEY_DELETE = 65535;

const GTK_CLOSE_ICON = Gio.icon_new_for_string(Extension.path + "/icons/gtk-close.png");

// Read more: http://blog.fpmurphy.com/2011/04/replace-gnome-shell-activities-text-string-with-icon.html#ixzz3ndrA3Jrl



// TodoList object
function SectionItem(parent_menu, sections, id)
{
    this._init(parent_menu, sections, id);
}

SectionItem.prototype = {
    __proto__ : PopupMenu.PopupSubMenuMenuItem.prototype,
    _init: function(parent_menu, sections, id)
    {
        debug("section : "+ id);
        this.sections = sections;
        let section = sections[id];

        debug("Got section with name: "+ section.name);
        this.id = section.id;
        this.name = section.name;
        this.tasks = section.tasks;

        this.parent_menu = parent_menu;

        // Fill section from the associated file
        this.n_tasks = 0;
        this.metaConn = [];


        PopupMenu.PopupSubMenuMenuItem.prototype._init.call(this, this.name);
        let logo = new St.Icon({icon_size: 12, gicon: GTK_CLOSE_ICON,
                                style_class: 'icon_sec'});
        this.supr = new St.Button({ style_class: 'sec_supr', label:''});
        this.supr.add_actor(logo);
        this.actor.add_actor(this.supr);
        this.new_task = Lang.bind(this, this._add_task);
        this._draw_section('init', false);
        this.metaConn.push(this.actor.connect('button-release-event', 
                                              Lang.bind(this, this._clicked)));
        this.metaConn.push(this.actor.connect('key-release-event',  
                           Lang.bind(this, this._key_pressed)));
        this.metaConn.push(this.supr.connect('clicked',
                           Lang.bind(this, this._supr_call)));
    },
    _key_pressed : function(actor, ev)
    {
        let symbol = ev.get_key_symbol();
        if (symbol == KEY_DELETE && this.n_tasks == 0)
        {
            debug('Delete key press in section');
            this._supr_call();
        }
    },
    _clicked : function(actor, ev)
    {
        var double_click = ev.get_click_count() == 2;

        // Add rename on double click
        if (double_click)
        {
            debug('Double click in section');
            this.parent_menu.close();
            let mod = new RenameDialog(this.name);
            mod.set_callback(Lang.bind(this, this._rename));
            mod.open();
        }
    },
    _draw_section: function(caller, redraw=true)
    {
        debug('Draw section for '+ caller);
        this._clear();

        // Initiate the task count
        let diff = this.n_tasks;
        this.n_tasks = 0;


        // Get section content and create file if needed
        this.supr.hide();
        for(var i=0; i < this.tasks.length; i++)
        {
            // Create a task item and set its callback
            let taskItem = new TaskItem.TaskItem(this.parent_menu, i, this.tasks[i]);
            taskItem.connect(
                'name_changed', 
                Lang.bind(this, function(o, id, new_name){
                    this.sections[this.id].tasks[id] = new_name;
                    this.emit("dump_signal", false);
                    this._draw_section("_rename_task", true);
                }));
            taskItem.connect(
                'supr_signal', 
                Lang.bind(this, function(o, id){
                    debug('callback supr_signal in section')
                    this._remove_task(id);
                }));
            this.menu.addMenuItem(taskItem);
            this.n_tasks++;
        }
        this.label.set_text(this.name + " (" + this.n_tasks + ")");
        diff = diff - this.n_tasks;
        if(redraw && diff != 0)
            this.emit('task_count_changed', diff);
        if(this.n_tasks == 0)
            this.supr.show();

        if(redraw)
            this.menu.open();

        let entry_task = new EntryItem();
        entry_task.connect('new_task', this.new_task);
        this.menu.addMenuItem(entry_task);
        return this;
    },
    _add_task : function(item, text)
    {
        // Don't add empty task
        if (text == '' || text == '\n')
            return;
        debug("Add task to section " + text);

        this.sections[this.id].tasks.push(text);
        this.emit("dump_signal", false);
        this._draw_section("_add_task", true);
    },
    _remove_task : function (id)
    {
        this.sections[this.id].tasks.splice(id);
        this.emit("dump_signal", false);
        this._draw_section("_remove_task", true);
    },
    _rename : function(text)
    {
        if(text == this.name || text.length == 0)
            return;

        this.sections[this.id].name = text;
        this.emit("dump_signal", true);
        debug("rename new : " +this.sections[this.id].name);
        return;
    },
    _clear : function()
    {
        let item = null;
        let items = this.menu._getMenuItems();
        for (let i=0; i<items.length; i++)
        {
            item = items[i];
            item._destroy();
            item.disconnectAll();
        }
        this.menu.removeAll();

    },
    _destroy: function(){
        for each (var conn in this.metaConn){
            this.disconnect(conn);
            this.metaConn.pop();
        }
        debug("Section clean-up done")
    },
    _supr_call : function()
    {
        debug('Emit supr signal');
        this.emit('supr_signal', this.name, this.id);
    }
}