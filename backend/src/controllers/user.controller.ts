import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { createUserSchema, updateUserSchema, getUsersQuerySchema } from '../schemas/user.schema';

export async function createUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createUserSchema.parse(req.body);
    const user = await userService.createUser(req.user!.id, input);
    return res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    next(error);
  }
}

export async function getUsersController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = getUsersQuerySchema.parse(req.query);
    const result = await userService.getUsers(query);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getUserByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUserById(req.params.id);
    return res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function updateUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateUserSchema.parse(req.body);
    const user = await userService.updateUser(req.user!.id, req.params.id, input);
    return res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    next(error);
  }
}

export async function deactivateUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.deactivateUser(req.user!.id, req.params.id);
    return res.status(200).json({ message: 'User deactivated successfully', user });
  } catch (error) {
    next(error);
  }
}
