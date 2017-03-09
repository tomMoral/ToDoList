const GLib = imports.gi.GLib;

const TYPE_OPTIONS = {
	"latex": {
		"todo": "%TODO -e \\TODO",
		"args":"--include=*.tex"
	},
	"python": {
		"todo": "\"# TODO\"",
		"args":"--include=*.py"
	}
}


function get_todo_project(project) {
	let type_option = TYPE_OPTIONS[project.type];
	let Popen = GLib.spawn_command_line_sync(
		"grep -rn -e " + type_option.todo
		+" " + type_option.args
		+" --exclude-dir=.* " + project.dir);
	let stdout = Popen[1].toString();
	let stderr = Popen[2].toString();

	let lines = stdout.split("\n");
	let todo_project = [];
	let id = 0;
	for (var i = lines.length - 1; i >= 0; i--) {
		let file = lines[i].split(":");
		let line = file[1];
		file = file[0];
		if (file.length > 0){
			let task = lines[i];
			task = task.replace(/^.*TODO/, "");
			let todo = {
				"file" : file,
				"line" : line,
				"name" : task.replace(/^ *:/, "")
			};
			todo_project[id] = todo;
			id ++;
		}

	}
	return todo_project;
}


function get_project_tasks(projects){
	let project_tasks = {};
	for (var i = projects.length - 1; i >= 0; i--) {
		var project = projects[i];
		let l_tasks = get_todo_project(project);
		var project_name = project.dir.split("/");
		project_name = project_name[project_name.length-1]
		project_tasks[i] = {
			"id": i,
			"name": project_name,
			"tasks": l_tasks
		};
	}
	return project_tasks;
}