import { type Lang } from "@/types";

export const messages: Record<Lang, Record<string, string>> = {
  en: {
    eventName: "Auspicious Light Festival 2025",
    title: "Welcome!",
    description: "Please enter your name to continue.",
    nameLabel: "Your name",
    submit: "Start",
    langButton: "中文",
  },
  zh: {
    eventName: "圆根灯会 2025",
    title: "欢迎！",
    description: "请输入您的名字以继续。",
    nameLabel: "您的名字",
    submit: "开始",
    langButton: "ENG",
  },
};

export const gameMessages: Record<Lang, Record<string, string>> = {
  en: {
    giveUp: "You gave up!",
    missingCode: "Missing Code!",
    invalidCode: "Invalid Code!",
    questionNotFound: "Question not found.",
    scannerError: "Scanner error",
    correctAnswer: "Correct answer! 🎉",
    incorrectAnswer: "Incorrect answer, try again!",
    somethingWentWrong: "Something went wrong.",
    answerLabel: "Answer",
    submitLabel: "Submit",
    giveUpLabel: "I give up",
    scratchCard: "Scratch Card",
    scratchCardDescription:
      "Complete the Scratch Card by visitng the different stations",
    scratchCardComplete: "Head over to Level 4 Counter to collect your prize!",
    scratchCardIncomplete:
      "You have unlocked 1 part of the scratch card! More to go!",
  },
  zh: {
    giveUp: "您已放弃！",
    missingCode: "缺少代码！",
    invalidCode: "无效代码！",
    questionNotFound: "找不到该问题.",
    scannerError: "扫描错误",
    correctAnswer: "回答正确！🎉",
    incorrectAnswer: "回答不正确，请再试一次！",
    somethingWentWrong: "发生了一些错误。",
    answerLabel: "答案",
    submitLabel: "提交答案",
    giveUpLabel: "我放弃了",
    scratchCard: "刮刮卡",
    scratchCardDescription: "前往不同站点集章，完成你的刮刮卡",
    scratchCardComplete: "请前往四楼柜台领取您的奖品！",
    scratchCardIncomplete: `你已经解锁了刮刮卡的 1 个部分！
    继续加油！`,
  },
};
