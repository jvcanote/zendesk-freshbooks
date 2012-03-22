(function() {

  ZendeskApps.FreshBooksApp = ZendeskApps.App.extend({
    location: ZendeskApps.Site.TICKET_PROPERTIES,
    appID: '/apps/01-freshbooks/versions/1.0.0',
    name: 'FreshBooks',

    //Local vars
    clients:    [],
    memberID:   undefined,
    notes:      '',
    hours:      '',
    projectID:  undefined,
    projects:   [],
    tasks:      [],
    users:      [],

    translations: {
      error: {
        contact_email: 'or contact Freshbooks support at <a href="mailto:support@freshbooks.com">support@freshbooks.com</a>.',
        occurred: "An error occured",
        see_topic: 'See <a target="_blank" href="https://support.zendesk.com/forums/4372">this topic</a> for troubleshooting'
      },

      global: {
        back: "Back",
        logout: "logout",
        sign_in: "Sign in",
        submit: "Submit",
        submitting: "Submitting..."
      },

      form: {
        empty: "{{field}} is empty!",
        hours: "Hours",
        note_text: "Ticket: {{ticketID}}",
        notes: "Notes",
        select_project: "Select Project",
        select_task: "Select Task",
        success: "Hours sucessfuly logged!"
      },

      problem: "There's been a problem: {{error}}",

      projects: {
        not_found: "No projects found for your FreshBooks account!"
      },

      users: {
        none: "Could not find any users.",
        not_found: "No users found for your FreshBooks account!",
        not_selected: "No user is selected!",
        select: "Select User"
      }
    },

    xmlTemplates: {
      PAGINATED:  'body=<?xml version="1.0" encoding="utf-8"?>' +
                  '<request method="%@">' +
                  '  <page>%@</page>' +
                  '  <per_page>100</per_page>' +
                  '</request>',
      TASK_LIST:  'body=<?xml version="1.0" encoding="utf-8"?>'+
                  '<request method="task.list">' +
                  '  <project_id>%@</project_id>' +
                  '  <page>%@</page>' +
                  '  <per_page>100</per_page>' +
                  '</request>',
      TIME_ENTRY: 'body=<?xml version="1.0" encoding="ISO-8859-1"?>' +
                  '<request method="time_entry.create">' +
                  '  <time_entry>' +
                  '    <project_id>%@</project_id>' +
                  '    <task_id>%@</task_id>' +
                  '    <hours>%@</hours>' +
                  '    <notes><![CDATA[%@]]></notes>' +
                  '    <staff_id>%@</staff_id>' +
                  '  </time_entry>' +
                  '</request>'
    },

    defaultSheet: 'loading',

    dependencies: {
      currentTicketID:  'workspace.ticket.id'
    },

    templates: {
      main: '<div class="freshbooks_app">' +
            '  <div><h3>FreshBooks</h3></div><hr/>' +
            '  <section data-sheet-name="loading" class="loading"></section>' +
            '  <section data-sheet-name="hours" class="hours"></section>' +
            '  <section data-sheet-name="users" class="users"></section>' +
            '  <section data-sheet-name="message" class="message"></section>' +
            '</div>',
      formData: '<form><div class="field"><p class="title">{{I18n.form.select_project}}</p><p><select class="projects" name="project_id"><option></option>' +
                '{{#projects}}<option value="{{id}}">{{name}}</option>{{/projects}}' +
                '</select></p></div>' +
                '<div class="field"><p class="title">{{I18n.form.select_task}}<p><p><select name="task_id">' +
                '{{#tasks}}<option value="{{id}}">{{name}}</option>{{/tasks}}' +
                '</select></p></div>' +
                '<div class="field"><p class="title">{{I18n.form.notes}}<p><textarea class="notes" name="notes">{{notes}}</textarea></p></div>' +
                '<div class="field"><p class="title">{{I18n.form.hours}}<p><input class="input_hours" type="text" name="hours" value="{{hours}}" /></p></div>' +
                '<p class="input"><input disabled="disabled" type="submit" value="{{I18n.global.submit}}" class="submit" onclick="return false"/>' +
                ' &nbsp;&nbsp;&nbsp;&nbsp; (<a class="logout" href="#" onclick="return false;">{{I18n.global.logout}}</a>)</p>' +
                '</form>',
      usersData:  '<form><p>{{I18n.users.select}}: &nbsp;&nbsp;<select name="id">' +
                  '{{#users}}<option value="{{id}}">{{name}}</option>{{/users}}' +
                  '</select></p><p class="input"><input type="submit" value="{{I18n.global.sign_in}}" class="submit" onclick="return false"/></p></form>' +
                  '{{^users}}{{I18n.users.none}}{{/users}}',
      submitFail: '<div class="error">' +
                  ' <p>{{I18n.error.occurred}}:</p><p class="exception">{{message}}</p>' +
                  ' <p>{{{I18n.error.see_topic}}}</p>'+
                  ' <p>{{{I18n.error.contact_email}}}</p>' +
                  '</div>' +
                  '<div class="back"><a href="#" onclick="return false;"><< {{I18n.global.back}}</a></div>',
      submitSuccess:  '<div class="success">{{message}}</div>' +
                      '<div class="back"><a href="#" onclick="return false;"><< {{I18n.global.back}}</a></div>'
    },

    launch: function(host, settings) {
      this.firstRequest();
    },

    requests: {
      loadClients:  function(data, userID) { return this._postRequest(data, userID); },
      loadProjects: function(data, userID) { return this._postRequest(data, userID); },
      loadTasks:    function(data, userID) { return this._postRequest(data, userID); },
      loadUsers:    function(data, userID) { return this._postRequest(data, userID); },
      postHours:    function(data, userID) { return this._postRequest(data, userID); }
    },

    events: {
      'click .back':                            'backToForm',
      'click .hours .logout':                   'logout',
      'click .hours .submit':                   'submitHours',
      'click .users .submit':                   'submitUser',
      'change .hours select[name=project_id]':  'changeProject',
      'change .hours select[name=task_id]':     'enableInput',
      'keypress .hours input[name=hours]':      'maskUserInput',

      /** AJAX callbacks **/
      'loadClients.success':  'handleLoadClientsResult',
      'loadProjects.success': 'handleLoadProjectsResult',
      'loadTasks.success':    'handleLoadTasksResult',
      'loadUsers.success':    'handleLoadUsersResult',
      'postHours.success':    'handlePostHoursResult',
      'loadClients.fail':     'handleFailedRequest',
      'loadProjects.fail':    'handleFailedRequest',
      'loadTasks.fail':       'handleFailedRequest',
      'loadUsers.fail':       'handleFailedRequest',
      'postHours.fail':       'handleFailedRequest'
    },

    backToForm: function() {
      this.sheet('hours').show();
    },

    changeProject: function() {
      var form = this.$('.hours form'), projectID = form.find('select[name=project_id]').val();

      if ( projectID.length === 0 )
        return;

      // Save data to repopulate when we redraw form
      this.hours = form.find('input[name=hours]').val();
      this.notes = form.find('textarea[name=notes]').val();
      this.projectID = projectID;
      this.tasks = [];

      this.disableInput(form);
      this.request('loadTasks').perform(this._requestTaskList({ page: 1, projectID: this.projectID }), this.settings.token);
    },

    firstRequest: function() {
      this._resetLocalVars();
      this.request('loadUsers').perform(this._requestStaffList({ page: 1 }), this.settings.token);
    },

    handleLoadClientsResult: function(e, data) {
      var self = this, client, clients = this.$(data).find('clients'), page = parseInt(clients.attr('page'), 10), pages = parseInt(clients.attr('pages'), 10);

      clients.children('client').each(function(index, el) {
        client = self.$(el);
        self.clients[client.children('client_id').text()] = client.children('organization').text();
      });

      if (page < pages) {
        this.request('loadClients').perform(this._requestProjectList({ page: (page + 1) }), this.settings.token);
      } else {
        this.request('loadProjects').perform(this._requestProjectList({ page: 1 }), this.settings.token);
      }
    },

    handleLoadProjectsResult: function(e, data) {
      var client, form = this.$('.hours form'), name, notes, self = this, project, projects = this.$(data).find('projects'),
          page = parseInt(projects.attr('page'), 10), pages = parseInt(projects.attr('pages'), 10), results = [];

      projects.children('project').each(function(index, el) {
        project = self.$(el);
        client =  self.clients[project.children('client_id').text()];
        name =    project.children('name').text();

        if (client)
          name = "%@ - %@".fmt(name, client);

        results.push({
          id: project.children('project_id').text(),
          name: name
        });
      });

      this.projects = this.projects.concat(results);

      if (this.projects.length === 0) {
        this.showError(this.I18n.t('projects.not_found'));
      } else if (page < pages) {
        this.request('loadProjects').perform(this._requestProjectList({ page: (page + 1) }), this.settings.token);
      } else {
        notes = this.I18n.t('form.note_text', { ticketID: this.deps.currentTicketID });

        this.sheet('hours')
            .render('formData', { projects: this.projects, notes: notes })
            .show();
      }
    },

    handleLoadTasksResult: function(e, data) {
      var form, self = this, task, tasks = this.$(data).find('tasks'), page = parseInt(tasks.attr('page'), 10), pages = parseInt(tasks.attr('pages'), 10), results = [];

      tasks.children('task').each(function(index, el) {
        task = self.$(el);
        results.push({
          id: task.children('task_id').text(),
          name: task.children('name').text()
        });
      });

      this.tasks = this.tasks.concat(results);

      if (page < pages) {
        this.request('loadTasks').perform(this._requestTaskList({ page: (page + 1), projectID: this.projectID }), this.settings.token);
      } else {
        this.sheet('hours')
            .render('formData', { projects: this.projects, hours: this.hours, notes: this.notes, tasks: this.tasks })
            .show();

        form = this.$('.hours form');
        this.enableInput(form);
        form.find('select[name=project_id]').val(this.projectID);
      }
    },

    handleLoadUsersResult: function(e, data) {
      var member, self = this, results = [], staffMembers = this.$(data).find('staff_members'), page = parseInt(staffMembers.attr('page'), 10), pages = parseInt(staffMembers.attr('pages'), 10);

      staffMembers.children('member').each(function(index, el) {
        member = self.$(el);
        results.push({
          id:   member.children('staff_id').text(),
          name: "%@ %@".fmt(member.children('first_name').text(), member.children('last_name').text())
        });
      });

      this.users = this.users.concat(results);

      if (this.users.length === 0) {
        this.showError(this.I18n.t('users.not_found'));
      } else if (page < pages) {
        this.request('loadUsers').perform(this._requestStaffList({ page: (page + 1) }), this.settings.token);
      } else {
        this.sheet('users')
          .render('usersData', { users: this.users })
          .show();
      }
    },

    handlePostHoursResult: function(e, data) {
      var form, response = $(data).find('response');

      if (response.attr('status') === 'fail') {
        this.showError(response.find('error').text());
      } else {
        this.showSuccess(this.I18n.t('form.success'));
        form = this.$('.hours form');
        form.find('input[name=hours]').val('');
        form.find('textarea[name=notes]').val(this.I18n.t('form.note_text', { ticketID: this.deps.currentTicketID }));
      }

      this.enableInput(this.$('.hours form'));
    },

    logout: function() {
      var form = this.$('.hours form');

      this.disableInput(form);
      this.firstRequest();
    },

    maskUserInput: function(event) {
      var charCode = event.which, value = event.target.value;

      if (charCode > 58 || (charCode < 48 && charCode !== 46 && charCode !== 8) ) { // Not number, '.', ':' or Backspace
        return false;
      } else if ((charCode === 46 || charCode === 58) && (value.search(/\./) > -1 || value.search(/:/) > -1)) { // Only one '.' OR one ':'
        return false;
      }
    },

    submitHours: function() {
      var field, form = this.$('.hours form'), name, options = {}, passed = true, self = this;

      form.find(':input')
          .not(':button, :submit, :reset, :hidden')
          .not('textarea')
          .each(function(index, el) {
            field = $(el);
            name = field.attr('name');

            if (!field.val()) {
              alert( self.I18n.t('form.empty', { field: name.replace('_id', '').capitalize() }) );
              passed = false;
            }

            options[name] = field.val();
          });

      if (!passed)
        return false;

      options.staff_id = this.memberID;
      this.disableInput(form);
      this.request('postHours').perform(this._requestTimeEntryCreate(options), this.settings.token);
    },

    submitUser: function() {
      var form =    this.$('.users form'),
          select =  form.find('select');

      if ( !select.val() ) {
        alert(this.I18n.t('users.not_selected'));
        return false;
      }

      this.memberID = select.val();
      this.disableSubmit(form);
      this.request('loadClients').perform(this._requestClientList({ page: 1 }), this.settings.token);
    },

    _postRequest: function(data, userID) {
      return {
        data:         data,
        dataType:     'xml',
        processData:  false,
        type:         'POST',
        url:          this._proxyURL(),
        headers:      {
          'Authorization': 'Basic ' + Base64.encode('%@:X'.fmt(userID))
        }
      };
    },

    _proxyURL: function() {
        var settings = this.settings;

        return encodeURI(
          '/proxy/direct?url=%@&timeout=10'
           .fmt(
             settings.url
           )
         );
      },

    _requestClientList: function(options) {
      return this._requestPaginated('client.list', options.page);
    },

    _requestTimeEntryCreate: function(options) {
      return encodeURI(
        this.xmlTemplates.TIME_ENTRY
            .fmt(
              options.project_id,
              options.task_id,
              options.hours,
              options.notes,
              options.staff_id
            )
      );
    },

    _requestPaginated: function(method, page) {
      return encodeURI( this.xmlTemplates.PAGINATED.fmt(method, page) );
    },

    _requestProjectList: function(options) {
      return this._requestPaginated('project.list', options.page);
    },

    _requestStaffList: function(options) {
      return this._requestPaginated('staff.list', options.page);
    },

    _requestTaskList: function(options) {
      return encodeURI( this.xmlTemplates.TASK_LIST.fmt(options.projectID, options.page) );
    },

    _resetLocalVars: function() {
      this.clients =    [];
      this.memberID =   undefined;
      this.notes =      '';
      this.hours =      '';
      this.projectID =  undefined;
      this.projects =   [];
      this.users =      [];
    },

    /** Helpers **/
    disableInput: function(form) {
      form.find(':input')
          .prop('disabled', true);
      form.find('a')
          .prop('disabled', true);
    },

    disableSubmit: function(form) {
      var submit = form.find('input[type=submit]');
      submit
        .data('originalValue', submit.val())
        .prop('disabled', true)
        .val(this.I18n.t('global.submitting'));
    },

    enableInput: function(form) {
      form.find(':input')
          .prop('disabled', false);
      form.find('a')
          .prop('disabled', false);
    },

    enableSubmit: function(form) {
      var submit = this.$(form.find('input[type=submit]'));
      submit
        .prop('disabled', false)
        .val(submit.data('originalValue'));
    },

    handleFailedRequest: function(event, jqXHR, textStatus, errorThrown) { this.showError( this.I18n.t('problem', { error: errorThrown.toString() }) ); },

    showError: function(msg) {
      this.sheet('message')
        .render('submitFail', { message: msg })
        .show();
    },

    showSuccess: function(msg) {
      this.sheet('message')
        .render('submitSuccess', { message: msg })
        .show();
    }
  });

}());
