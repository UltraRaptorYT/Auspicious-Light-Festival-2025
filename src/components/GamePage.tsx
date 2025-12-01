import { useState, useCallback, FormEvent } from "react";
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
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useLocalStorageState } from "@/lib/hooks/useLocalStorageState";
import { gameMessages } from "@/translate";

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
  };

  return (
    <div className={`w-full max-w-md p-6 space-y-6 ${fontClass}`}>
      <h1 className="text-2xl font-semibold tracking-tight text-center pt-8">
        {message.eventName}
      </h1>
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
          paused={openDialog}
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
                : `${user.name} 欢迎你！`}
            </DialogTitle>
            <DialogDescription>
              {lang === "en"
                ? "You're already registered."
                : "你已经登记好了。"}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Button onClick={() => processCode(`auspicious_light_${1}`)}>
        Trigger Scan
      </Button>

      {/* Question Dialog */}
      <Dialog open={openDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{"Welcome to Station #" + question?.id}</DialogTitle>
            {/* <DialogDescription className="whitespace-pre-line">
              {getDialogDescription(question, "challenge")}
            </DialogDescription> */}
          </DialogHeader>

          {/* Challenge content */}
          {question?.qn.type === "INPUT" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p>
                {lang == "en"
                  ? question.qn.question_en
                  : question.qn.question_zh}
              </p>

              <div className="grid w-full max-w-sm items-center gap-3">
                <Label htmlFor="answer">Answer</Label>
                <Input
                  id="answer"
                  type="text"
                  placeholder="Answer"
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                />
              </div>

              {/* ACTION ROW */}
              <div className="flex flex-row items-center justify-center gap-3">
                <Button type="submit">Submit</Button>

                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      toast.info(gameMessages[lang].giveUp);
                      setOpenDialog(false);
                    }}
                  >
                    I give up
                  </Button>
                </DialogClose>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
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
