
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
function SectionItem(parent, sections, id)
{
    this._init(parent, sections, id);
}

SectionItem.prototype = {
    __proto__ : PopupMenu.PopupSubMenuMenuItem.prototype,
    _init: function(parent, sections, id)
    {
        debug("section : "+ id);
        this.sections = sections;
        this.section = sections[id];
        let section = this.section;

        debug("Got section with name: "+ section.name);
        this.id = section.id;
        this.name = section.name;
        this.tasks = section.tasks;

        this.parent_menu = parent.menu;

        // Fill section from the associated file
        this.n_tasks = 0;
        this.metaConn = [];


        PopupMenu.PopupSubMenuMenuItem.prototype._init.call(this, this.name);
        let logo = new St.Icon({icon_size: 12, gicon: GTK_CLOSE_ICON,
                                style_class: 'icon_sec'});
        this.delete_btn = new St.Button({ style_class: 'sec_supr', label:''});
        this.delete_btn.add_actor(logo);
        this.actor.add_actor(this.delete_btn);
        this._draw_section('init', false);
        this.metaConn.push(this.actor.connect('button-release-event', 
                                              Lang.bind(this, this._clicked)));
        this.metaConn.push(this.actor.connect('key-release-event',  
                           Lang.bind(this, this._key_pressed)));
        this.metaConn.push(this.delete_btn.connect('clicked',
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

        // Add tasks item in the section
        for(var i=0; i < this.tasks.length; i++)
            this._add_task(i);

        // Update the title of the section with the right task count
        // and notify the todolist applet if this count changed.
        this._set_text();
        diff = diff - this.n_tasks;
        if(redraw && diff != 0)
            this.emit('task_count_changed', diff);

        // If there is no task in the section,show the delete button.
        if(this.n_tasks == 0)
            this.delete_btn.show();

        if(redraw)
            this.menu.open();

        let entry_task = new EntryItem();
        entry_task.connect('new_task', Lang.bind(this, this._create_task));
        this.menu.addMenuItem(entry_task);
        return this;
    },
    _add_task : function(i)
    {
        // Create a task item and set its callback
        let taskItem = new TaskItem.TaskItem(this.section.tasks[i]);

        // connect the signals to 
        taskItem.connect('name_changed', Lang.bind(this, this._dump));
        taskItem.connect('supr_signal', Lang.bind(this, this._remove_task));

        // Add the task to the section
        this.menu.addMenuItem(taskItem, i);
        this.n_tasks ++;

        // If it is the first task added, hide the delete
        // button for the section.
        if(this.n_tasks == 1)
            this.delete_btn.hide();

    },
    _create_task : function(item, text)
    {
        // Create a new task to add in the todolist
        // and displays it while updating the counters
        // of our widget.

        // Don't add empty task
        if (text == '' || text == '\n')
            return;

        // New task object
        task = {name: text}

        id = this.tasks.push(task) - 1;
        this._add_task(id);
        this._set_text();

        debug("Emit signals");
        this.emit('task_count_changed', -1);
        this._dump();
    },
    _remove_task : function (o, task)
    {
        // Remove task from the section
        let id = this.section.tasks.indexOf(task);
        this.section.tasks.splice(id, 1);
        this.n_tasks --;

        // If there is no more tasks, show the delete button
        if(this.n_tasks == 0)
            this.delete_btn.show();

        // Set section title
        this._set_text();
        this.emit('task_count_changed', 1);
        this._dump();

    },
    _rename : function(text)
    {
        // No change needed
        if(text == this.name || text.length == 0)
            return;

        // Update
        this.section.name = text;
        this.name = text;
        this._set_text();
        this._dump();
    },
    _clear : function()
    {
        let item = null;
        let items = this.menu._getMenuItems();
        for (let i=0; i<items.length; i++)
        {
            item = items[i];
            item.disconnectAll();
            item.destroy();
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
        this.emit('supr_signal', this.section.name, this.id);
    },
    _set_text : function(){
        // Set text of the label with the counter of tasks
        this.label.set_text(this.section.name + " (" + this.n_tasks + ")");
    },
    _dump : function(){
        this.emit("dump_signal", false);
    }
}