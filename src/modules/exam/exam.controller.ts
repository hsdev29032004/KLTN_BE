import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ExamService } from './exam.service';
import { User } from '@/common/decorators/user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { SkipPermission } from '@/common/decorators/authenticated.decorator';
import type { IUser } from '@/shared/types/user.type';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { CreateExamQuestionDto } from './dto/create-exam-question.dto';
import { UpdateExamQuestionDto } from './dto/update-exam-question.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';

@Controller('exam')
export class ExamController {
  constructor(private readonly examService: ExamService) { }

  // ═══════════════════════════════════════════════════════════════════════════
  // Teacher APIs
  // ═══════════════════════════════════════════════════════════════════════════

  @Roles('teacher')
  @Post('course/:courseId')
  createExam(
    @User() user: IUser,
    @Param('courseId') courseId: string,
    @Body() dto: CreateExamDto,
  ) {
    return this.examService.createExam(user.id, courseId, dto);
  }

  @Roles('teacher')
  @Put(':examId')
  updateExam(
    @User() user: IUser,
    @Param('examId') examId: string,
    @Body() dto: UpdateExamDto,
  ) {
    return this.examService.updateExam(user.id, examId, dto);
  }

  @Roles('teacher')
  @Delete(':examId')
  deleteExam(@User() user: IUser, @Param('examId') examId: string) {
    return this.examService.deleteExam(user.id, examId);
  }

  @Roles('teacher')
  @Get(':examId/detail')
  getExamDetail(@User() user: IUser, @Param('examId') examId: string) {
    return this.examService.getExamDetail(user.id, examId);
  }

  // ── Questions ─────────────────────────────────────────────────────────────

  @Roles('teacher')
  @Post(':examId/question')
  createQuestion(
    @User() user: IUser,
    @Param('examId') examId: string,
    @Body() dto: CreateExamQuestionDto,
  ) {
    return this.examService.createQuestion(user.id, examId, dto);
  }

  @Roles('teacher')
  @Post(':examId/questions')
  createManyQuestions(
    @User() user: IUser,
    @Param('examId') examId: string,
    @Body() dtos: CreateExamQuestionDto[],
  ) {
    return this.examService.createManyQuestions(user.id, examId, dtos);
  }

  @Roles('teacher')
  @Put('question/:questionId')
  updateQuestion(
    @User() user: IUser,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateExamQuestionDto,
  ) {
    return this.examService.updateQuestion(user.id, questionId, dto);
  }

  @Roles('teacher')
  @Delete('question/:questionId')
  deleteQuestion(
    @User() user: IUser,
    @Param('questionId') questionId: string,
  ) {
    return this.examService.deleteQuestion(user.id, questionId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Student APIs
  // ═══════════════════════════════════════════════════════════════════════════

  @Roles('user')
  @Get(':examId/info')
  getExamInfo(@User() user: IUser, @Param('examId') examId: string) {
    return this.examService.getExamInfo(user.id, examId);
  }

  @Roles('user')
  @Post(':examId/start')
  startExam(@User() user: IUser, @Param('examId') examId: string) {
    return this.examService.startExam(user.id, examId);
  }

  @Roles('user')
  @Post('attempt/:attemptId/submit')
  submitExam(
    @User() user: IUser,
    @Param('attemptId') attemptId: string,
    @Body() dto: SubmitExamDto,
  ) {
    return this.examService.submitExam(user.id, attemptId, dto);
  }

  @Roles('user')
  @Get('attempt/:attemptId/result')
  getAttemptResult(
    @User() user: IUser,
    @Param('attemptId') attemptId: string,
  ) {
    return this.examService.getAttemptResult(user.id, attemptId);
  }

  @Roles('user')
  @Get(':examId/history')
  getExamHistory(@User() user: IUser, @Param('examId') examId: string) {
    return this.examService.getExamHistory(user.id, examId);
  }

  @Roles('user')
  @Get('course/:courseId/history')
  getCourseExamHistory(
    @User() user: IUser,
    @Param('courseId') courseId: string,
  ) {
    return this.examService.getCourseExamHistory(user.id, courseId);
  }
}
