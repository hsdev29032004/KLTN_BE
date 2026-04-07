import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { LessonStatus } from '@prisma/client';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { CreateExamQuestionDto } from './dto/create-exam-question.dto';
import { UpdateExamQuestionDto } from './dto/update-exam-question.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';

@Injectable()
export class ExamService {
  constructor(private readonly prisma: PrismaService) { }

  // ── Teacher: Tạo đề thi ──────────────────────────────────────────────────

  async createExam(userId: string, courseId: string, dto: CreateExamDto) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    if (course.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền thao tác khóa học này');

    const exam = await this.prisma.exam.create({
      data: {
        name: dto.name,
        passPercent: dto.passPercent,
        retryAfterDays: dto.retryAfterDays,
        questionCount: dto.questionCount,
        duration: dto.duration,
        courseId,
        status: LessonStatus.draft,
      },
    });

    return { message: 'Tạo đề thi thành công', data: exam };
  }

  // ── Teacher: Cập nhật đề thi ──────────────────────────────────────────────

  async updateExam(userId: string, examId: string, dto: UpdateExamDto) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, isDeleted: false },
      include: { course: { select: { userId: true, status: true } } },
    });
    if (!exam) throw new NotFoundException('Đề thi không tồn tại');
    if (exam.course.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền thao tác đề thi này');

    const updated = await this.prisma.exam.update({
      where: { id: examId },
      data: { ...dto },
    });

    return { message: 'Cập nhật đề thi thành công', data: updated };
  }

  // ── Teacher: Xóa đề thi ──────────────────────────────────────────────────

  async deleteExam(userId: string, examId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, isDeleted: false },
      include: { course: { select: { userId: true } } },
    });
    if (!exam) throw new NotFoundException('Đề thi không tồn tại');
    if (exam.course.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền thao tác đề thi này');

    if (exam.status === LessonStatus.draft) {
      await this.prisma.$transaction([
        this.prisma.examQuestion.deleteMany({ where: { examId } }),
        this.prisma.exam.delete({ where: { id: examId } }),
      ]);
    } else {
      await this.prisma.exam.update({
        where: { id: examId },
        data: { status: LessonStatus.outdated },
      });
    }

    return { message: 'Xóa đề thi thành công' };
  }

  // ── Teacher: Lấy chi tiết đề thi (bao gồm câu hỏi) ─────────────────────

  async getExamDetail(userId: string, examId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, isDeleted: false },
      include: {
        course: { select: { userId: true, name: true } },
        questions: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { questions: { where: { isDeleted: false } } } },
      },
    });
    if (!exam) throw new NotFoundException('Đề thi không tồn tại');
    if (exam.course.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền xem đề thi này');

    return { message: 'Lấy chi tiết đề thi thành công', data: exam };
  }

  // ── Teacher: Thêm câu hỏi ────────────────────────────────────────────────

  async createQuestion(userId: string, examId: string, dto: CreateExamQuestionDto) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, isDeleted: false },
      include: { course: { select: { userId: true } } },
    });
    if (!exam) throw new NotFoundException('Đề thi không tồn tại');
    if (exam.course.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền thao tác đề thi này');

    const question = await this.prisma.examQuestion.create({
      data: {
        examId,
        content: dto.content,
        optionA: dto.optionA,
        optionB: dto.optionB,
        optionC: dto.optionC,
        optionD: dto.optionD,
        correctAnswer: dto.correctAnswer,
      },
    });

    return { message: 'Thêm câu hỏi thành công', data: question };
  }

  // ── Teacher: Thêm nhiều câu hỏi cùng lúc ────────────────────────────────

  async createManyQuestions(userId: string, examId: string, dtos: CreateExamQuestionDto[]) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, isDeleted: false },
      include: { course: { select: { userId: true } } },
    });
    if (!exam) throw new NotFoundException('Đề thi không tồn tại');
    if (exam.course.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền thao tác đề thi này');

    const questions = await this.prisma.examQuestion.createMany({
      data: dtos.map((dto) => ({
        examId,
        content: dto.content,
        optionA: dto.optionA,
        optionB: dto.optionB,
        optionC: dto.optionC,
        optionD: dto.optionD,
        correctAnswer: dto.correctAnswer,
      })),
    });

    return { message: `Thêm ${questions.count} câu hỏi thành công`, data: questions };
  }

  // ── Teacher: Cập nhật câu hỏi ────────────────────────────────────────────

  async updateQuestion(userId: string, questionId: string, dto: UpdateExamQuestionDto) {
    const question = await this.prisma.examQuestion.findFirst({
      where: { id: questionId, isDeleted: false },
      include: { exam: { include: { course: { select: { userId: true } } } } },
    });
    if (!question) throw new NotFoundException('Câu hỏi không tồn tại');
    if (question.exam.course.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền thao tác câu hỏi này');

    const updated = await this.prisma.examQuestion.update({
      where: { id: questionId },
      data: { ...dto },
    });

    return { message: 'Cập nhật câu hỏi thành công', data: updated };
  }

  // ── Teacher: Xóa câu hỏi ─────────────────────────────────────────────────

  async deleteQuestion(userId: string, questionId: string) {
    const question = await this.prisma.examQuestion.findFirst({
      where: { id: questionId, isDeleted: false },
      include: { exam: { include: { course: { select: { userId: true } } } } },
    });
    if (!question) throw new NotFoundException('Câu hỏi không tồn tại');
    if (question.exam.course.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền thao tác câu hỏi này');

    await this.prisma.examQuestion.update({
      where: { id: questionId },
      data: { isDeleted: true },
    });

    return { message: 'Xóa câu hỏi thành công' };
  }

  // ── Student: Lấy thông tin đề thi (không bao gồm đáp án đúng) ────────────

  async getExamInfo(userId: string, examId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, isDeleted: false },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            userCourses: { where: { userId }, select: { id: true } },
          },
        },
        _count: { select: { questions: { where: { isDeleted: false } } } },
      },
    });
    if (!exam) throw new NotFoundException('Đề thi không tồn tại');

    if (exam.course.userCourses.length === 0) {
      throw new ForbiddenException('Bạn chưa mua khóa học này');
    }

    // Lấy lần thi gần nhất
    const lastAttempt = await this.prisma.examAttempt.findFirst({
      where: { examId, userId },
      orderBy: { createdAt: 'desc' },
    });

    // Kiểm tra có thể thi không
    let canTakeExam = true;
    let retryAvailableAt: Date | null = null;

    if (lastAttempt) {
      if (!lastAttempt.isCompleted) {
        // Có bài thi chưa hoàn thành → tiếp tục bài đó
        return {
          message: 'Lấy thông tin đề thi thành công',
          data: {
            id: exam.id,
            name: exam.name,
            passPercent: exam.passPercent,
            duration: exam.duration,
            questionCount: exam.questionCount,
            totalQuestions: exam._count.questions,
            courseName: exam.course.name,
            hasPassed: false,
            canTakeExam: true,
            retryAvailableAt: null,
            inProgressAttemptId: lastAttempt.id,
          },
        };
      }

      if (lastAttempt.isPassed) {
        return {
          message: 'Lấy thông tin đề thi thành công',
          data: {
            id: exam.id,
            name: exam.name,
            passPercent: exam.passPercent,
            duration: exam.duration,
            questionCount: exam.questionCount,
            totalQuestions: exam._count.questions,
            courseName: exam.course.name,
            hasPassed: true,
            canTakeExam: false,
            retryAvailableAt: null,
            inProgressAttemptId: null,
          },
        };
      }

      // Chưa pass → kiểm tra retry
      const retryDate = new Date(lastAttempt.submittedAt || lastAttempt.createdAt);
      retryDate.setDate(retryDate.getDate() + exam.retryAfterDays);

      if (new Date() < retryDate) {
        canTakeExam = false;
        retryAvailableAt = retryDate;
      }
    }

    return {
      message: 'Lấy thông tin đề thi thành công',
      data: {
        id: exam.id,
        name: exam.name,
        passPercent: exam.passPercent,
        duration: exam.duration,
        questionCount: exam.questionCount,
        totalQuestions: exam._count.questions,
        courseName: exam.course.name,
        hasPassed: false,
        canTakeExam,
        retryAvailableAt,
        inProgressAttemptId: null,
      },
    };
  }

  // ── Student: Bắt đầu làm bài thi ─────────────────────────────────────────

  async startExam(userId: string, examId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, isDeleted: false },
      include: {
        course: {
          select: {
            id: true,
            userCourses: { where: { userId }, select: { id: true } },
          },
        },
      },
    });
    if (!exam) throw new NotFoundException('Đề thi không tồn tại');

    if (exam.course.userCourses.length === 0) {
      throw new ForbiddenException('Bạn chưa mua khóa học này');
    }

    // Kiểm tra có bài thi chưa hoàn thành
    const inProgress = await this.prisma.examAttempt.findFirst({
      where: { examId, userId, isCompleted: false },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                content: true,
                optionA: true,
                optionB: true,
                optionC: true,
                optionD: true,
              },
            },
          },
        },
      },
    });

    if (inProgress) {
      return {
        message: 'Tiếp tục bài thi đang làm',
        data: {
          attemptId: inProgress.id,
          startedAt: inProgress.startedAt,
          duration: exam.duration,
          questions: inProgress.answers.map((a) => ({
            questionId: a.questionId,
            content: a.question.content,
            optionA: a.question.optionA,
            optionB: a.question.optionB,
            optionC: a.question.optionC,
            optionD: a.question.optionD,
            selectedAnswer: a.selectedAnswer,
          })),
        },
      };
    }

    // Kiểm tra đã pass chưa
    const passed = await this.prisma.examAttempt.findFirst({
      where: { examId, userId, isPassed: true },
    });
    if (passed) {
      throw new BadRequestException('Bạn đã vượt qua đề thi này rồi');
    }

    // Kiểm tra retry cooldown
    const lastAttempt = await this.prisma.examAttempt.findFirst({
      where: { examId, userId, isCompleted: true },
      orderBy: { createdAt: 'desc' },
    });

    if (lastAttempt) {
      const retryDate = new Date(lastAttempt.submittedAt || lastAttempt.createdAt);
      retryDate.setDate(retryDate.getDate() + exam.retryAfterDays);
      if (new Date() < retryDate) {
        throw new BadRequestException(
          `Bạn chỉ có thể làm lại sau ngày ${retryDate.toLocaleDateString('vi-VN')}`,
        );
      }
    }

    // Lấy câu hỏi ngẫu nhiên
    const allQuestions = await this.prisma.examQuestion.findMany({
      where: { examId, isDeleted: false },
      select: {
        id: true,
        content: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
      },
    });

    if (allQuestions.length < exam.questionCount) {
      throw new BadRequestException(
        `Đề thi chưa có đủ câu hỏi (cần ${exam.questionCount}, hiện có ${allQuestions.length})`,
      );
    }

    // Fisher-Yates shuffle → lấy questionCount câu đầu
    const shuffled = [...allQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selectedQuestions = shuffled.slice(0, exam.questionCount);

    // Tạo attempt + answer records
    const attempt = await this.prisma.examAttempt.create({
      data: {
        examId,
        userId,
        answers: {
          create: selectedQuestions.map((q) => ({
            questionId: q.id,
          })),
        },
      },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                content: true,
                optionA: true,
                optionB: true,
                optionC: true,
                optionD: true,
              },
            },
          },
        },
      },
    });

    return {
      message: 'Bắt đầu làm bài thi',
      data: {
        attemptId: attempt.id,
        startedAt: attempt.startedAt,
        duration: exam.duration,
        questions: attempt.answers.map((a) => ({
          questionId: a.questionId,
          content: a.question.content,
          optionA: a.question.optionA,
          optionB: a.question.optionB,
          optionC: a.question.optionC,
          optionD: a.question.optionD,
          selectedAnswer: null,
        })),
      },
    };
  }

  // ── Student: Nộp bài thi ──────────────────────────────────────────────────

  async submitExam(userId: string, attemptId: string, dto: SubmitExamDto) {
    const attempt = await this.prisma.examAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        exam: true,
        answers: {
          include: { question: { select: { id: true, correctAnswer: true } } },
        },
      },
    });

    if (!attempt) throw new NotFoundException('Bài thi không tồn tại');
    if (attempt.isCompleted) throw new BadRequestException('Bài thi đã được nộp');

    // Map questionId → correctAnswer
    const answerMap = new Map(
      attempt.answers.map((a) => [a.questionId, a.question.correctAnswer]),
    );

    // Cập nhật từng câu trả lời
    let correctCount = 0;
    const updates = dto.answers.map((ans) => {
      const correct = answerMap.get(ans.questionId);
      const isCorrect = correct === ans.selectedAnswer;
      if (isCorrect) correctCount++;

      return this.prisma.examAttemptAnswer.updateMany({
        where: { attemptId, questionId: ans.questionId },
        data: {
          selectedAnswer: ans.selectedAnswer,
          isCorrect,
        },
      });
    });

    const totalQuestions = attempt.answers.length;
    const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
    const isPassed = score >= attempt.exam.passPercent;

    await this.prisma.$transaction([
      ...updates,
      this.prisma.examAttempt.update({
        where: { id: attemptId },
        data: {
          score,
          isPassed,
          isCompleted: true,
          submittedAt: new Date(),
        },
      }),
    ]);

    return {
      message: 'Nộp bài thi thành công',
      data: {
        attemptId,
        score: Math.round(score * 100) / 100,
        isPassed,
        correctCount,
        totalQuestions,
        passPercent: attempt.exam.passPercent,
      },
    };
  }

  // ── Student: Lấy kết quả bài thi ─────────────────────────────────────────

  async getAttemptResult(userId: string, attemptId: string) {
    const attempt = await this.prisma.examAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            passPercent: true,
            duration: true,
            course: { select: { id: true, name: true } },
          },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                content: true,
                optionA: true,
                optionB: true,
                optionC: true,
                optionD: true,
                correctAnswer: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!attempt) throw new NotFoundException('Bài thi không tồn tại');
    if (!attempt.isCompleted)
      throw new BadRequestException('Bài thi chưa được nộp');

    return {
      message: 'Lấy kết quả bài thi thành công',
      data: {
        attemptId: attempt.id,
        examName: attempt.exam.name,
        courseName: attempt.exam.course.name,
        score: attempt.score,
        isPassed: attempt.isPassed,
        passPercent: attempt.exam.passPercent,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        totalQuestions: attempt.answers.length,
        correctCount: attempt.answers.filter((a) => a.isCorrect).length,
        answers: attempt.answers.map((a) => ({
          questionId: a.questionId,
          content: a.question.content,
          optionA: a.question.optionA,
          optionB: a.question.optionB,
          optionC: a.question.optionC,
          optionD: a.question.optionD,
          correctAnswer: a.question.correctAnswer,
          selectedAnswer: a.selectedAnswer,
          isCorrect: a.isCorrect,
        })),
      },
    };
  }

  // ── Student: Lịch sử làm thi ─────────────────────────────────────────────

  async getExamHistory(userId: string, examId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, isDeleted: false },
      select: {
        id: true,
        name: true,
        passPercent: true,
        duration: true,
        questionCount: true,
        course: { select: { id: true, name: true } },
      },
    });
    if (!exam) throw new NotFoundException('Đề thi không tồn tại');

    const attempts = await this.prisma.examAttempt.findMany({
      where: { examId, userId },
      select: {
        id: true,
        score: true,
        isPassed: true,
        isCompleted: true,
        startedAt: true,
        submittedAt: true,
        _count: { select: { answers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Lấy lịch sử làm thi thành công',
      data: {
        exam: {
          id: exam.id,
          name: exam.name,
          passPercent: exam.passPercent,
          duration: exam.duration,
          questionCount: exam.questionCount,
          courseName: exam.course.name,
        },
        attempts,
      },
    };
  }

  // ── Student: Lịch sử thi tất cả đề trong 1 khóa học ─────────────────────

  async getCourseExamHistory(userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
      select: { id: true, name: true },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');

    const exams = await this.prisma.exam.findMany({
      where: {
        courseId,
        isDeleted: false,
        status: { in: [LessonStatus.published, LessonStatus.draft] },
      },
      select: {
        id: true,
        name: true,
        passPercent: true,
        duration: true,
        questionCount: true,
        createdAt: true,
        attempts: {
          where: { userId },
          select: {
            id: true,
            score: true,
            isPassed: true,
            isCompleted: true,
            startedAt: true,
            submittedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      message: 'Lấy lịch sử thi khóa học thành công',
      data: {
        courseId: course.id,
        courseName: course.name,
        exams,
      },
    };
  }
}
