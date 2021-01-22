import { useCallback, useRef, useEffect } from "react";
import { FeedEntry } from "../../types/feedTypes";
import { BatchMarkFeedAsReadBufferEntry } from "../api/useBatchMarkFeedAsReadRequestBuffer";
import useRequestBuffer from "../api/useRequestBuffer";
import useFieldSelector from "../shared/useFieldSelector";
import { useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";

export type SpeakNewEntriesInFeed = (
  newEntries: FeedEntry[],
  feedName: string
) => void;

type BatchMarkFeedAsSpokenBufferEntry = BatchMarkFeedAsReadBufferEntry;
export const UTTERANCE_RATE = 0.9;
export const BATCH_MARK_FEED_AS_SPOKEN_BUFFER =
  "BATCH_MARK_FEED_AS_SPOKEN_BUFFER";

export default function useAnnouncer() {
  const disableSend = useSelector(
    (state: RootState) => !state.auth.currentUser
  );
  const voiceURI = useFieldSelector("settings", "voice");

  const firstVoiceFetch = useRef(true);

  const mapBufferToRequestBody = useCallback(
    (buffer: BatchMarkFeedAsSpokenBufferEntry[]) => ({
      buffer,
    }),
    []
  );

  useRequestBuffer<BatchMarkFeedAsSpokenBufferEntry>(
    `/api/v1/spoken/batchFeed`,
    BATCH_MARK_FEED_AS_SPOKEN_BUFFER,
    disableSend,
    mapBufferToRequestBody
  );

  useEffect(
    function speakNewVoice() {
      if (!voiceURI) return;
      if (firstVoiceFetch.current) {
        firstVoiceFetch.current = false;
        return;
      }
      const voice = window.speechSynthesis
        .getVoices()
        .find((voice) => voice.voiceURI === voiceURI);
      const utterance = new SpeechSynthesisUtterance(
        "Hello, I am your new default voice."
      );
      if (voice) utterance.voice = voice;
      utterance.rate = UTTERANCE_RATE;
      window.speechSynthesis.speak(utterance);
    },
    [voiceURI]
  );
}
