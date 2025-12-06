"use client";

import { useState, useCallback, FormEvent, useEffect } from "react";
import { Lang, UserRow } from "@/types";
import {
  Scanner as ScannerComp,
  centerText,
  IDetectedBarcode,
} from "@yudiel/react-qr-scanner";
import { toast } from "sonner";
import { QuestionType } from "@/types";
import supabase from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  // DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocalStorageState } from "@/lib/hooks/useLocalStorageState";
import { gameMessages } from "@/translate";
import { ImageGridReveal } from "@/components/ImageGridReveal";
import MatchQuestionForm from "@/components/game/MatchQuestionForm";
import InputQuestionForm from "@/components/game/InputQuestionForm";
import SelectQuestionForm from "@/components/game/SelectQuestionForm";

type GamePageProps = {
  lang: Lang;
  user: UserRow;
  message: Record<string, string>;
  fontClass: "font-en" | "font-zh";
};

export default function GamePage({
  lang,
  user,
  message,
  fontClass,
}: GamePageProps) {
  const [question, setQuestion] = useState<QuestionType>();
  const [openDialog, setOpenDialog] = useState(false);
  const [answerInput, setAnswerInput] = useState("");
  const [openCorrect, setOpenCorrect] = useState(false);
  const rows = 6;
  const cols = 3;
  const total = rows * cols;
  const [revealed, setRevealed] = useState<boolean[]>(() =>
    Array(total).fill(false)
  );

  useEffect(() => {
    const fetchAnswered = async () => {
      const { data, error } = await supabase
        .from("auspicious_light_25_users_qr")
        .select("qr_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to fetch answered questions:", error);
        return;
      }

      // qr_id assumed to map 1..N corresponding to your grid cells (i+1)
      const answeredSet = new Set((data ?? []).map((row) => Number(row.qr_id)));

      setRevealed((prev) => prev.map((_, i) => answeredSet.has(i + 1)));
    };

    fetchAnswered();
  }, [user.id, total]);

  const [openWelcomeDialog, setOpenWelcomeDialog] = useLocalStorageState(
    "welcomeDialog",
    "true"
  );
  const processCode = async (rawCode: string | undefined) => {
    if (!rawCode) return toast.error(gameMessages[lang].missingCode);

    console.log("Processing code:", rawCode);
    const splitCode = rawCode.split("_");
    const questionNumber = splitCode.pop() || "";
    if (splitCode.join("_") !== "auspicious_light") {
      return toast.error(gameMessages[lang].invalidCode);
    }

    const questionRes = await openQuestion(questionNumber);

    console.log(questionRes);

    if (questionRes) {
      setQuestion(questionRes);
      setOpenDialog(true);
      setAnswerInput("");
    }
  };

  const completeChallenge = useCallback(
    async (q: QuestionType, extraFields: Record<string, any> = {}) => {
      try {
        // Log completion of this QR challenge
        const { error: iceErr } = await supabase
          .from("auspicious_light_25_users_qr")
          .insert({
            user_id: user.id,
            qr_id: q.id,
            ...extraFields,
          });
        console.log(
          {
            user_id: user.id,
            qr_id: q.id,
            ...extraFields,
          },
          iceErr
        );

        if (iceErr) {
          console.error("Insert error:", iceErr);
          toast.error(gameMessages[lang].somethingWentWrong);
          return false;
        }

        return true;
      } catch (err) {
        console.error(err);
        toast.error(gameMessages[lang].somethingWentWrong);
        return false;
      }
    },
    [user]
  );

  const openQuestion = async (questionNumber: string) => {
    try {
      if (!questionNumber) {
        throw new Error("Invalid Question Number");
      }

      console.log("Fetching question data for code:", questionNumber);

      const { data, error } = await supabase
        .from("auspicious_light_25_qr")
        .select()
        .eq("id", questionNumber);

      if (error) {
        console.error("Question fetch failed:", error);
        throw new Error(JSON.stringify(error) || "API error");
      }

      if (data && data.length > 0) {
        return data[0] as QuestionType;
      }

      return null;
    } catch (err) {
      console.error(err);
      toast.error(gameMessages[lang].questionNotFound);
      return null;
    }
  };

  const handleScan = useCallback(
    async (detectedCodes: IDetectedBarcode[]) => {
      if (openDialog) return;
      const code = detectedCodes[0]?.rawValue;
      return await processCode(code);
    },
    [openDialog]
  );

  const handleError = useCallback((error: unknown) => {
    if (error instanceof Error) {
      console.error("Scanner error:", error.message);
      toast.error(`${gameMessages[lang].scannerError}: ${error.message}`);
    } else {
      console.error("Unknown scanner error:", error);
      toast.error(
        `${lang == "en" ? "Unknown " : "未知"}${
          gameMessages[lang].scannerError
        }: ${String(error)}`
      );
    }
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!question || question.qn.type !== "INPUT") return;

    const userAnswer = String(answerInput).trim();
    const correctAnswer = String(
      lang == "en" ? question.qn.answer_en : question.qn.answer_zh
    ).trim();

    let isCorrect = userAnswer.toUpperCase() === correctAnswer.toUpperCase();
    if (question.id === 30) {
      console.log(correctAnswer, userAnswer);
      isCorrect = userAnswer.includes(correctAnswer);
    }

    if (!isCorrect) {
      toast.error(gameMessages[lang].incorrectAnswer);
      return;
    }

    toast.success(gameMessages[lang].correctAnswer);

    const ok = await completeChallenge(question);
    if (!ok) return;

    setOpenCorrect(true);
    setOpenDialog(false);
    setRevealed((prev) =>
      prev.map((revealed, i) => revealed || i + 1 === question.id)
    );
  };

  return (
    <div className={`w-full max-w-md p-6 space-y-6 ${fontClass}`}>
      <div className="flex-col flex gap-2 items-center justify-center">
        <h1 className="text-2xl font-semibold tracking-tight text-center pt-8">
          {message.eventName}
        </h1>
        <p className="max-w-64 text-center">
          {revealed.filter((e) => !e).length == 0 &&
            gameMessages[lang].scratchCardComplete}
        </p>
      </div>
      <div className="mx-auto aspect-square max-w-3xl border w-full">
        <ScannerComp
          formats={[
            "qr_code",
            "micro_qr_code",
            "rm_qr_code",
            "maxi_code",
            "pdf417",
            "aztec",
            "data_matrix",
            "matrix_codes",
            "dx_film_edge",
            "databar",
            "databar_expanded",
            "codabar",
            "code_39",
            "code_93",
            "code_128",
            "ean_8",
            "ean_13",
            "itf",
            "linear_codes",
            "upc_a",
            "upc_e",
          ]}
          onScan={handleScan}
          onError={handleError}
          components={{
            onOff: false,
            torch: true,
            zoom: true,
            finder: true,
            tracker: centerText,
          }}
          allowMultiple={false}
          scanDelay={0}
          paused={openDialog || openCorrect || openWelcomeDialog == "true"}
        />
      </div>

      {/* Welcome Dialog */}
      <Dialog
        open={openWelcomeDialog === "true"}
        onOpenChange={() => setOpenWelcomeDialog("false")}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lang === "en"
                ? `Welcome, ${user.name}!`
                : `${user.name} 欢迎您！`}
            </DialogTitle>
            <DialogDescription>
              {lang === "en"
                ? "You're already registered."
                : "您已经登记好了。"}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      {/*
      <Button onClick={() => processCode(`auspicious_light_${18}`)}>
        Trigger Scan
      </Button> */}

      {/* Result dialog */}
      <Dialog open={openCorrect} onOpenChange={setOpenCorrect}>
        <DialogContent showCloseButton={false}>
          <DialogHeader className="gap-5">
            <DialogTitle className="text-xl">
              {lang == "en"
                ? `Congratulations on solving Station #${question?.id}`
                : `恭喜您完成了第 #${question?.id} 站`}
              {/* {getDialogTitle(question, "result")} */}
            </DialogTitle>
            <DialogDescription className="text-base whitespace-pre-line">
              {/* {getDialogDescription(question, "result")} */}
              {revealed.filter((e) => !e).length == 0
                ? gameMessages[lang].scratchCardComplete
                : gameMessages[lang].scratchCardIncomplete}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={openDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {lang == "en"
                ? `Welcome to Station #${question?.id}`
                : `欢迎您到第 #${question?.id} 站`}
            </DialogTitle>
            {/* <DialogDescription className="whitespace-pre-line">
              {getDialogDescription(question, "challenge")}
            </DialogDescription> */}
          </DialogHeader>

          {/* Challenge content */}
          {question && question.qn.type === "INPUT" && (
            <InputQuestionForm
              question={question}
              lang={lang}
              onCorrect={async () => {
                const ok = await completeChallenge(question);
                if (!ok) return;

                setOpenCorrect(true);
                setOpenDialog(false);
                setRevealed((prev) =>
                  prev.map(
                    (revealedCell, i) => revealedCell || i + 1 === question.id
                  )
                );
              }}
              onGiveUp={() => {
                toast.info(gameMessages[lang].giveUp);
                setOpenDialog(false);
              }}
            />
          )}
          {question?.qn.type === "MATCH" ? (
            <MatchQuestionForm
              question={question}
              lang={lang}
              onCorrect={async () => {
                const ok = await completeChallenge(question);
                if (!ok) return;

                setOpenCorrect(true);
                setOpenDialog(false);
                setRevealed((prev) =>
                  prev.map(
                    (revealedCell, i) => revealedCell || i + 1 === question.id
                  )
                );
              }}
              onGiveUp={() => {
                toast.info(gameMessages[lang].giveUp);
                setOpenDialog(false);
              }}
            />
          ) : null}

          {question?.qn.type === "SELECT" ? (
            <SelectQuestionForm
              question={question}
              lang={lang}
              onCorrect={async () => {
                // Optional: store what the user chose
                const ok = await completeChallenge(question);
                if (!ok) return;

                setOpenCorrect(true);
                setOpenDialog(false);
                setRevealed((prev) =>
                  prev.map(
                    (revealedCell, i) => revealedCell || i + 1 === question.id
                  )
                );
              }}
              onGiveUp={() => {
                toast.info(gameMessages[lang].giveUp);
                setOpenDialog(false);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col gap-2 items-center justify-center">
          <h1 className="font-bold text-center text-lg underline underline-offset-4">
            &nbsp;{gameMessages[lang].scratchCard}&nbsp;
          </h1>
          <p className="text-base">
            {gameMessages[lang].scratchCardDescription}
          </p>
        </div>
        <ImageGridReveal
          src="/auspicious_light_bg.jpeg"
          alt="auspicious_light_bg"
          rows={rows}
          cols={cols}
          revealed={revealed}
          onRevealChange={(next) => setRevealed(next)}
        />
      </div>
    </div>
  );
}

// question?.qn.type === "FILE" ? (
//             <form onSubmit={handleFileSubmit} className="space-y-4 w-full">
//               <p>{question.qn.question}</p>

//               <Dropzone
//                 className="whitespace-pre-line w-full"
//                 maxFiles={3}
//                 onDrop={handleDrop}
//                 onError={console.error}
//                 src={files}
//               >
//                 <DropzoneEmptyState />
//                 <DropzoneContent />
//               </Dropzone>

//               {/* ACTION ROW */}
//               <div className="flex flex-row items-center justify-center gap-3">
//                 <Button type="submit" disabled={!files || files.length === 0}>
//                   Submit
//                 </Button>

//                 <DialogClose asChild>
//                   <Button
//                     type="button"
//                     variant="destructive"
//                     onClick={() => {
//                       toast.info("You gave up!");
//                       setOpenDialog(false);
//                     }}
//                   >
//                     I give up
//                   </Button>
//                 </DialogClose>
//               </div>
//             </form>
//           ) : question?.qn.type === "TASK" ? (
//             <div className="space-y-4">
//               <p>{question.qn.question}</p>

//               {/* ACTION ROW */}
//               <div className="flex flex-row items-center justify-center gap-3">
//                 <Button onClick={handleTaskComplete}>Completed</Button>

//                 <DialogClose asChild>
//                   <Button
//                     type="button"
//                     variant="destructive"
//                     onClick={() => {
//                       toast.info("You gave up!");
//                       setOpenDialog(false);
//                     }}
//                   >
//                     I give up
//                   </Button>
//                 </DialogClose>
//               </div>
//             </div>
//           ) :
