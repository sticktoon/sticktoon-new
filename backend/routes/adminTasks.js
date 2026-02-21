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
    const { user, title, description, dueDate } = req.body;

    const newTask = new Task({
      user,
      title,
      description,
      dueDate,
      createdBy: req.user.id,
    });

    const savedTask = await newTask.save();
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
    const { status } = req.body;

    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: "Failed to update task" });
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
