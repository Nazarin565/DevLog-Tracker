import { Router } from 'express';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  CreateSubtasksSchema,
  UpdateSubtaskSchema,
  TaskQuerySchema,
} from '@devlog/shared';
import type { TaskRepository } from '../db/taskRepository.js';
import type { SubtaskRepository } from '../db/subtaskRepository.js';
import { NotFoundError } from '../middleware/errorHandler.js';

export function createTaskRouter(
  taskRepo: TaskRepository,
  subtaskRepo: SubtaskRepository
): Router {
  const router = Router();

  router.get('/', (req, res, next) => {
    try {
      const query = TaskQuerySchema.parse(req.query);
      res.json(taskRepo.findAll(query));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', (req, res, next) => {
    try {
      const input = CreateTaskSchema.parse(req.body);
      res.status(201).json(taskRepo.create(input));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', (req, res, next) => {
    try {
      const task = taskRepo.findById(req.params.id);
      if (!task) throw new NotFoundError('Task');
      res.json(task);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', (req, res, next) => {
    try {
      const input = UpdateTaskSchema.parse(req.body);
      const task = taskRepo.update(req.params.id, input);
      if (!task) throw new NotFoundError('Task');
      res.json(task);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', (req, res, next) => {
    try {
      const deleted = taskRepo.remove(req.params.id);
      if (!deleted) throw new NotFoundError('Task');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/subtasks', (req, res, next) => {
    try {
      if (!taskRepo.findById(req.params.id)) throw new NotFoundError('Task');
      const input = CreateSubtasksSchema.parse(req.body);
      const subtasks = subtaskRepo.createMany(
        req.params.id,
        input.subtasks.map((s) => s.title)
      );
      res.status(201).json(subtasks);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/subtasks/single', (req, res, next) => {
    try {
      if (!taskRepo.findById(req.params.id)) throw new NotFoundError('Task');
      const { title } = req.body;
      if (typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({ error: { message: '`title` is required', code: 'validation_error' } });
        return;
      }
      res.status(201).json(subtaskRepo.createOne(req.params.id, title.trim()));
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id/subtasks/:subId', (req, res, next) => {
    try {
      if (!taskRepo.findById(req.params.id)) throw new NotFoundError('Task');
      const input = UpdateSubtaskSchema.parse(req.body);
      const subtask = subtaskRepo.update(req.params.subId, input);
      if (!subtask) throw new NotFoundError('Subtask');
      res.json(subtask);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id/subtasks/:subId', (req, res, next) => {
    try {
      if (!taskRepo.findById(req.params.id)) throw new NotFoundError('Task');
      const deleted = subtaskRepo.remove(req.params.subId);
      if (!deleted) throw new NotFoundError('Subtask');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
