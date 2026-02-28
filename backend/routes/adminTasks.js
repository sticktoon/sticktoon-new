const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const auth = require("../middleware/auth");

/* ==============================
   GET ALL TASKS
================================= */
router.get("/", auth, async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate("user", "name email")
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

/* ==============================
   CREATE TASK
================================= */
router.post("/", auth, async (req, res) => {
  try {
    const {
      user,
      assignedTo,
      title,
      description,
      status,
      dueDate,
      reminderAt,
      relatedToType,
      relatedToId,
      taskType,
    } = req.body;

    const actorName = req.user.name || "Admin";

    const newTask = new Task({
      user,
      assignedTo: assignedTo || user,
      title,
      description,
      status: status || "Pending",
      dueDate,
      reminderAt: reminderAt || null,
      relatedToType: relatedToType || "",
      relatedToId: relatedToId || "",
      taskType: taskType || "Internal Task",
      activityTimeline: [
        {
          message: `Task created by ${actorName}`,
        },
      ],
      createdBy: req.user.id,
    });

    const savedTask = await newTask.save();
    await savedTask.populate("user", "name email");
    await savedTask.populate("assignedTo", "name email");
    await savedTask.populate("createdBy", "name email");
    res.status(201).json(savedTask);
  } catch (err) {
    res.status(400).json({ message: "Failed to create task" });
  }
});

/* ==============================
   UPDATE TASK STATUS
================================= */
router.patch("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const {
      title,
      description,
      status,
      dueDate,
      reminderAt,
      relatedToType,
      relatedToId,
      taskType,
      assignedTo,
    } = req.body || {};

    const actorName = req.user.name || "Admin";
    const timelineEntries = [];

    if (typeof title === "string" && title.trim() && title !== task.title) {
      task.title = title.trim();
      timelineEntries.push(`Title updated by ${actorName}`);
    }
    if (typeof description === "string" && description !== (task.description || "")) {
      task.description = description;
      timelineEntries.push(`Description updated by ${actorName}`);
    }
    if (typeof status === "string" && status && status !== task.status) {
      timelineEntries.push(`Status changed: ${task.status} -> ${status}`);
      task.status = status;
    }
    if (typeof dueDate !== "undefined") {
      const nextDue = dueDate ? new Date(dueDate) : null;
      const prevDue = task.dueDate ? task.dueDate.getTime() : null;
      const currDue = nextDue ? nextDue.getTime() : null;
      if (prevDue !== currDue) {
        task.dueDate = nextDue;
        timelineEntries.push(`Due date updated by ${actorName}`);
      }
    }
    if (typeof reminderAt !== "undefined") {
      const nextReminder = reminderAt ? new Date(reminderAt) : null;
      const prevReminder = task.reminderAt ? task.reminderAt.getTime() : null;
      const currReminder = nextReminder ? nextReminder.getTime() : null;
      if (prevReminder !== currReminder) {
        task.reminderAt = nextReminder;
        timelineEntries.push(`Reminder updated by ${actorName}`);
      }
    }
    if (typeof relatedToType === "string" && relatedToType !== task.relatedToType) {
      task.relatedToType = relatedToType;
      timelineEntries.push(`Related type updated by ${actorName}`);
    }
    if (typeof relatedToId === "string" && relatedToId !== task.relatedToId) {
      task.relatedToId = relatedToId;
      timelineEntries.push(`Related entity updated by ${actorName}`);
    }
    if (typeof taskType === "string" && taskType && taskType !== task.taskType) {
      task.taskType = taskType;
      timelineEntries.push(`Task type updated by ${actorName}`);
    }
    if (typeof assignedTo !== "undefined") {
      const nextAssigned = assignedTo || null;
      const prevAssigned = task.assignedTo ? String(task.assignedTo) : null;
      if (prevAssigned !== nextAssigned) {
        task.assignedTo = nextAssigned;
        timelineEntries.push(`Assigned user updated by ${actorName}`);
      }
    }

    if (timelineEntries.length) {
      task.activityTimeline.push(
        ...timelineEntries.map((message) => ({
          message,
        })),
      );
    }

    await task.save();
    await task.populate("user", "name email");
    await task.populate("assignedTo", "name email");
    await task.populate("createdBy", "name email");

    res.json(task);
  } catch (err) {
    res.status(400).json({ message: "Failed to update task" });
  }
});

/* ==============================
   ADD COMMENT
================================= */
router.post("/:id/comments", auth, async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const authorName = req.user.name || "Admin";
    task.comments.push({
      authorName,
      text: text.trim(),
    });
    task.activityTimeline.push({
      message: `Comment added by ${authorName}`,
    });

    await task.save();
    await task.populate("user", "name email");
    await task.populate("assignedTo", "name email");
    await task.populate("createdBy", "name email");

    res.json(task);
  } catch (err) {
    res.status(400).json({ message: "Failed to add comment" });
  }
});

/* ==============================
   DELETE TASK
================================= */
router.delete("/:id", auth, async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(400).json({ message: "Failed to delete task" });
  }
});

module.exports = router;
