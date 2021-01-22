import styles from "./EntrySimpleView.module.css";
import entryStyles from "./Entry.module.css";

import React from "react";
import moment from "moment";
import numeral from "numeral";
import classNames from "classnames";
import he from "he";
import { useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";
import useFieldSelector from "../shared/useFieldSelector";

type Props = {
  entry: any;
  shouldShowAuthor?: boolean;
};

export default function EntrySimpleView({ entry, shouldShowAuthor }: Props) {
  const settings = useSelector((state: RootState) => state.settings);
  const readMap = useFieldSelector("feeds", "readMap");
  const starredMap = useFieldSelector("feeds", "starredMap");

  const entryView = (
    <>
      {starredMap && starredMap[entry.id] ? (
        <div className={classNames(entryStyles.Star, entryStyles.NoMargin)}>
          ★
        </div>
      ) : undefined}
      <div className={entryStyles.EntryText}>
        <div
          className={classNames(entryStyles.Title, styles.SmallTitle, {
            [entryStyles.NoImage]: !entry.image,
          })}
        >
          {entry.text}{" "}
          <span className={entryStyles.TitleSub}>
            {entry.domain ? "(" + entry.domain + ") " : ""}
            {entry.flair ? entry.flair + " " : ""}
          </span>
        </div>
        <div className={entryStyles.Sub}>
          {entry.author ? <span>{entry.author + " "}</span> : ""}

          {/* Reddit  */}
          {entry.upvotes !== undefined ? (
            <span>{"↑" + entry.upvotes}</span>
          ) : (
            ""
          )}
          {entry.numComments !== undefined ? (
            <span>{numeral(entry.numComments).format("0a") + " comments"}</span>
          ) : (
            ""
          )}

          {/* Twitter */}
          {entry.retweets !== undefined ? (
            <span>{numeral(entry.retweets).format("0a") + " retweets"}</span>
          ) : (
            ""
          )}
          {entry.favorites !== undefined ? (
            <span>{numeral(entry.favorites).format("0a") + " favorites"}</span>
          ) : (
            ""
          )}

          {/* YouTube */}
          {entry.views !== undefined ? (
            <span>{numeral(entry.views).format("0a") + " views"}</span>
          ) : (
            ""
          )}

          {entry.time !== undefined ? (
            <span>{moment(entry.time).fromNow()}</span>
          ) : (
            ""
          )}
        </div>
      </div>
      {entry.author && settings.shouldShowSmallEntries ? (
        <div
          className={classNames(entryStyles.EntryAuthor, {
            [entryStyles.Visible]: shouldShowAuthor,
          })}
        >
          {entry.author}
        </div>
      ) : undefined}
      {entry.image ? (
        <img
          className={entryStyles.Thumbnail}
          src={he.decode(entry.image)}
          alt="thumb"
        />
      ) : undefined}
    </>
  );

  return (
    <span
      data-test="simple-entry"
      className={classNames(
        entryStyles.Entry,
        styles.SmallEntry,
        entryStyles.NoHover,
        {
          [entryStyles.Read]: readMap && readMap[entry.id],
          [entryStyles.Starred]: starredMap && starredMap[entry.id],
        }
      )}
      id={entry.id}
    >
      {entryView}
    </span>
  );
}
