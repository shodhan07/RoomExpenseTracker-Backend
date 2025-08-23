import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { createHousehold, joinHousehold, listHouseholds, addExpense, listExpenses, summary } from '../controllers/expenseController.js';

const router = Router();

router.post('/households', authRequired, createHousehold);
router.post('/households/join', authRequired, joinHousehold);
router.get('/households', authRequired, listHouseholds);

router.post('/expenses', authRequired, addExpense);
router.get('/expenses', authRequired, listExpenses);
router.get('/summary', authRequired, summary);

export default router;