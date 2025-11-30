import { useState, useCallback } from "react";
import { Lang, UserRow } from "@/types";
import {
  Scanner as ScannerComp,
  centerText,
  IDetectedBarcode,
} from "@yudiel/react-qr-scanner";
import { toast } from "sonner";
import { QuestionType } from "@/types";
import supabase from "@/lib/supabase";

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
  const processCode = async (rawCode: string | undefined) => {
    if (!rawCode) return toast.error("Missing Code!");

    console.log("Processing code:", rawCode);
    const splitCode = rawCode.split("_");
    if (splitCode[0] !== "zocampbanfoo") {
      return toast.error("Invalid Code!");
    }

    const questionNumber = splitCode[1];
    const questionRes = await openQuestion(questionNumber);

    console.log(questionRes);

    if (questionRes) {
      setQuestion(questionRes);
      setOpenDialog(true);
      setAnswerInput("");
    }
  };

  const openQuestion = async (questionNumber: string) => {
    try {
      if (!questionNumber) {
        throw new Error("Invalid Question Number");
      }

      console.log("Fetching question data for code:", questionNumber);

      const { data, error } = await supabase
        .from("zo_banfoo_25_qr")
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
      toast.error("Question not found");
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
      toast.error(`Scanner error: ${error.message}`);
    } else {
      console.error("Unknown scanner error:", error);
      toast.error(`Unknown scanner error:: ${String(error)}`);
    }
  }, []);

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
      <div className="mt-6 text-center space-y-2">
        <p className="text-lg font-semibold">
          {lang === "en" ? `Welcome, ${user.name}!` : `${user.name} 欢迎你！`}
        </p>
        <p className="text-sm text-zinc-600">
          {lang === "en" ? "You’re already registered." : "你已经登记好了。"}
        </p>
      </div>
    </div>
  );
}
