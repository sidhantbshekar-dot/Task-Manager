const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskError = document.getElementById('task-error');
const taskList = document.getElementById('tasks');
const taskSummary = document.getElementById('task-summary');
const taskDeadline = document.getElementById('task-deadline');
const deadlineError = document.getElementById('deadline-error');
const reminderPopup = document.getElementById('reminder-popup');
const reminderMessage = document.getElementById('reminder-message');
const reminderList = document.getElementById('reminder-list');
const reminderClose = document.getElementById('reminder-close');
const themeToggle = document.getElementById('theme-toggle');
const exportTasksButton = document.getElementById('export-tasks');
const filterButtons = document.querySelectorAll('.filter-btn');
let currentFilter = 'all';
let currentTheme = 'light';

const loadTheme = () => {
    return localStorage.getItem('taskManagerTheme') || 'light';
};

const saveTheme = (theme) => {
    localStorage.setItem('taskManagerTheme', theme);
};

const applyTheme = (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    themeToggle.setAttribute('aria-pressed', theme === 'dark');
};

const toggleTheme = () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
    saveTheme(currentTheme);
};

const exportTasksToExcel = () => {
    if (tasks.length === 0) {
        alert('There are no tasks to export.');
        return;
    }

    const headers = ['Task', 'Completed', 'Due date'];
    const csvRows = tasks.map((task) => {
        const text = `"${task.text.replace(/"/g, '""')}"`;
        const completed = task.completed ? 'Yes' : 'No';
        const dueDate = task.dueAt ? `"${formatDueDate(task.dueAt).replace(/"/g, '""')}"` : '';
        return `${text},${completed},${dueDate}`;
    });

    const csvContent = [headers.join(','), ...csvRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'task-list.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const loadTasks = () => {
    const storedTasks = localStorage.getItem('taskManagerTasks');
    return storedTasks ? JSON.parse(storedTasks) : [];
};

const saveTasks = (tasks) => {
    localStorage.setItem('taskManagerTasks', JSON.stringify(tasks));
};

let tasks = loadTasks();

const updateSummary = () => {
    const activeTasks = tasks.filter((task) => !task.completed).length;
    const totalTasks = tasks.length;

    if (totalTasks === 0) {
        taskSummary.textContent = 'No tasks yet';
        return;
    }

    taskSummary.textContent = `${activeTasks} active task${activeTasks === 1 ? '' : 's'} · ${totalTasks} total`;
};

const getVisibleTasks = () => {
    return tasks
        .map((task, index) => ({ task, index }))
        .filter(({ task }) => {
            if (currentFilter === 'completed') return task.completed;
            if (currentFilter === 'pending') return !task.completed;
            return true;
        });
};

const normalizeTaskText = (text) => text.trim().replace(/\s+/g, ' ');

const setValidationMessage = (message) => {
    const isInvalid = Boolean(message);
    taskInput.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');
    taskError.textContent = message;
};

const setDeadlineValidationMessage = (message) => {
    const isInvalid = Boolean(message);
    taskDeadline.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');
    deadlineError.textContent = message;
};

const formatDueDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return new Intl.DateTimeFormat(navigator.language, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    }).format(date);
};

const getExpiredTasks = () => {
    const now = new Date();
    return tasks.filter((task) => !task.completed && task.dueAt && new Date(task.dueAt) < now);
};

const showReminderPopup = () => {
    const expired = getExpiredTasks();
    if (expired.length === 0) {
        hideReminderPopup();
        return;
    }

    reminderMessage.textContent = expired.length === 1
        ? 'One task has passed its deadline.'
        : `${expired.length} tasks have passed their deadline.`;

    reminderList.innerHTML = expired
        .map((task) => `<li>${task.text} — due ${formatDueDate(task.dueAt)}</li>`)
        .join('');

    reminderPopup.classList.remove('hidden');
};

const hideReminderPopup = () => {
    reminderPopup.classList.add('hidden');
};

const setFilter = (filter) => {
    currentFilter = filter;
    filterButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.filter === filter);
    });
    renderTasks();
};

const createTaskMarkup = (task, index) => {
    const listItem = document.createElement('li');
    listItem.className = `task-item ${task.completed ? 'completed' : ''}`;
    listItem.dataset.index = index;

    const labelContainer = document.createElement('label');
    labelContainer.className = 'task-label';

    const checkboxWrapper = document.createElement('div');
    checkboxWrapper.className = 'task-meta';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;
    checkbox.setAttribute('aria-label', `Mark task ${task.text} as completed`);

    const text = document.createElement('p');
    text.className = `task-text ${task.completed ? 'completed' : ''}`;
    text.textContent = task.text;

    checkboxWrapper.appendChild(checkbox);
    labelContainer.appendChild(checkboxWrapper);
    labelContainer.appendChild(text);

    if (task.dueAt) {
        const dueDate = document.createElement('p');
        dueDate.className = 'task-due';
        dueDate.textContent = `Due ${formatDueDate(task.dueAt)}`;
        labelContainer.appendChild(dueDate);
    }

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete-button';
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('aria-label', `Delete task ${task.text}`);

    listItem.appendChild(labelContainer);
    listItem.appendChild(deleteButton);

    return listItem;
};

const renderTasks = () => {
    taskList.innerHTML = '';
    const visibleTasks = getVisibleTasks();

    if (tasks.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.className = 'task-item';
        emptyMessage.textContent = 'Add your first task to get started.';
        emptyMessage.style.fontStyle = 'italic';
        taskList.appendChild(emptyMessage);
        updateSummary();
        showReminderPopup();
        return;
    }

    if (visibleTasks.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.className = 'task-item';
        emptyMessage.textContent = 'No tasks match this filter.';
        emptyMessage.style.fontStyle = 'italic';
        taskList.appendChild(emptyMessage);
        updateSummary();
        showReminderPopup();
        return;
    }

    visibleTasks.forEach(({ task, index }) => {
        const taskItem = createTaskMarkup(task, index);
        taskList.appendChild(taskItem);
    });

    updateSummary();
    showReminderPopup();
};

const addTask = (text, deadline) => {
    const cleanText = normalizeTaskText(text);
    if (!cleanText) {
        setValidationMessage('Please enter a task before adding.');
        taskInput.focus();
        return;
    }

    if (!deadline) {
        setDeadlineValidationMessage('Please choose a due date and time.');
        taskDeadline.focus();
        return;
    }

    const dueDate = new Date(deadline);
    if (Number.isNaN(dueDate.getTime())) {
        setDeadlineValidationMessage('Please enter a valid date and time.');
        taskDeadline.focus();
        return;
    }

    tasks.unshift({ text: cleanText, completed: false, dueAt: deadline });
    saveTasks(tasks);
    setValidationMessage('');
    setDeadlineValidationMessage('');
    renderTasks();
    taskInput.value = '';
    taskDeadline.value = '';
    taskInput.focus();
};

const toggleTaskCompletion = (index) => {
    tasks[index].completed = !tasks[index].completed;
    saveTasks(tasks);
    renderTasks();
};

const deleteTask = (index) => {
    tasks.splice(index, 1);
    saveTasks(tasks);
    renderTasks();
};

taskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addTask(taskInput.value, taskDeadline.value);
});

taskInput.addEventListener('input', () => {
    if (taskInput.value.trim().length > 0) {
        setValidationMessage('');
    }
});

taskDeadline.addEventListener('input', () => {
    if (taskDeadline.value) {
        setDeadlineValidationMessage('');
    }
});

reminderClose.addEventListener('click', hideReminderPopup);

taskList.addEventListener('click', (event) => {
    if (!event.target.matches('.delete-button')) return;

    const listItem = event.target.closest('.task-item');
    if (!listItem) return;

    const index = Number(listItem.dataset.index);
    deleteTask(index);
});

taskList.addEventListener('change', (event) => {
    if (!event.target.matches('.task-checkbox')) return;

    const listItem = event.target.closest('.task-item');
    if (!listItem) return;

    const index = Number(listItem.dataset.index);
    toggleTaskCompletion(index);
});

filterButtons.forEach((button) => {
    button.addEventListener('click', () => setFilter(button.dataset.filter));
});

window.addEventListener('DOMContentLoaded', () => {
    currentTheme = loadTheme();
    applyTheme(currentTheme);
    renderTasks();
    setFilter(currentFilter);
    setInterval(showReminderPopup, 60_000);
});

themeToggle.addEventListener('click', toggleTheme);
exportTasksButton.addEventListener('click', exportTasksToExcel);
