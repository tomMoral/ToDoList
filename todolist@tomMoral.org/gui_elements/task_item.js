const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const Lang = imports.lang;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const RenameDialog = Extension.imports.gui_elements.rename_dialog.RenameDialog;
const debug = Extension.imports.utils.debug;

const Gettext = imports.gettext.domain('todolist');
const _ = Gettext.gettext;

const BUTTON_RELEASE = 7;
const GTK_CLOSE_ICON = Gio.icon_new_for_string(Extension.path + "/icons/gtk-close.png");

// TaskItem object
function TaskItem(parent_menu, id, name){
    this.conn = null;
    this._init(parent_menu, id, name);
}

TaskItem.prototype = {
    __proto__ : PopupMenu.PopupBaseMenuItem.prototype,
    _init: function(parent_menu, id, name){
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this);
        this.id = id;
        this.name = name;
        this.parent_menu = parent_menu;
        this.actor.add_style_class_name('task-item');
        let logo = new St.Icon({icon_size: 10, gicon: GTK_CLOSE_ICON});
        this._supr_btn = new St.Button({ style_class: 'task-supr', label: '',} );
        this.label = new St.Label({ 
            style_class: 'task-label', 
            text: name
        } );
        this._supr_btn.add_actor(logo)
        this.actor.add_actor(this.label);
        this.actor.add_actor(this._supr_btn);

        // Connections
        this.actor.connect('event',
                           Lang.bind(this, this._clicked));
        this.conn = this._supr_btn.connect('clicked',
                                     Lang.bind(this, this._supr_call));
    },
    _clicked : function(actor, ev){
        if(ev.type() != BUTTON_RELEASE)
            return;
        var double_click = ev.get_click_count() == 2;

        // Add rename on double click
        if (double_click){
            debug('Double click task!');
            this.parent_menu.close();
            let mod = new RenameDialog(this.name);
            mod.set_callback(Lang.bind(this, this._rename));
            mod.open();
        }
    },
    _destroy: function(){
        if(this.conn != null)
            this._supr_btn.disconnect(this.conn);
    },
    isEntry: function(){
        return false;
    },
    _rename : function(name){
        if(name == this.name || name.length == 0){
            return
        }

        // Emit signal so todolist clean up
        this.emit('name_changed', this.id, name);

        // Change the class variables
        this.label.set_text(name)

    },
    _supr_call : function(){
        debug('Emit supr signal')
        this.emit('supr_signal', this.id);
    }
}