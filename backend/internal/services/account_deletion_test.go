package services

import (
	"errors"
	"fmt"
	"sort"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

const (
	doomedUsername   = "doomed"
	survivorUsername = "survivor"
)

func mustCreate(t *testing.T, db *gorm.DB, v interface{}) {
	t.Helper()
	if err := db.Create(v).Error; err != nil {
		t.Fatalf("create %T: %v", v, err)
	}
}

// seedSetImages creates a set whose cover and character image names start with prefix.
func seedSetImages(t *testing.T, db *gorm.DB, ownerID uuid.UUID, prefix string, nChars int) models.CharacterSet {
	t.Helper()
	set := models.CharacterSet{ID: uuid.New(), UserID: ownerID, Name: prefix, CoverImage: r2URL(prefix + "-cover.png")}
	mustCreate(t, db, &set)
	for i := 0; i < nChars; i++ {
		mustCreate(t, db, &models.Character{Name: fmt.Sprintf("%s%d", prefix, i), Image: r2URL(fmt.Sprintf("%s-char%d.png", prefix, i)), SetID: set.ID})
	}
	return set
}

func seedLobby(t *testing.T, db *gorm.DB, hostID uuid.UUID, setID uuid.UUID, code string) models.Lobby {
	t.Helper()
	l := models.Lobby{ID: uuid.New(), UserID: hostID, Code: code, CharacterSetID: setID}
	mustCreate(t, db, &l)
	return l
}

func seedPlayer(t *testing.T, db *gorm.DB, lobbyID uuid.UUID, userID, guestID uuid.UUID) models.Player {
	t.Helper()
	p := models.Player{ID: uuid.New(), LobbyID: lobbyID, UserID: userID, GuestID: guestID, Name: "p"}
	mustCreate(t, db, &p)
	mustCreate(t, db, &models.GameState{PlayerID: p.ID, LobbyID: lobbyID, EliminatedCharacters: datatypes.JSON("[]")})
	return p
}

func seedMessage(t *testing.T, db *gorm.DB, lobbyID uuid.UUID, senderID, username string) models.StoredMessage {
	t.Helper()
	m := models.StoredMessage{LobbyID: lobbyID.String(), SenderID: senderID, Username: username, Content: "hi", Channel: "game"}
	mustCreate(t, db, &m)
	return m
}

// seedFullUser seeds a user ("doomed") with at least one row in every user-linked table, plus a
// second user ("survivor") who plays in the doomed user's hosted lobby and hosts a lobby of their own.
//
// Seeded for the doomed user (what TestPreview_Counts expects):
//   - 1 set with 6 characters and 7 distinct R2 images, 1 category, 1 like and 1 report on it from survivor
//   - 1 hosted lobby (L1) with a lobby character, the doomed player and the survivor player (+ game states),
//     a message from each of them
//   - a player in survivor's lobby (L2) with a game state, 1 message by player ID, 1 by username only
//   - 1 session, 1 game record (vs survivor), 1 like and 1 report on survivor's set, 1 poll vote, 1 feedback
//   - 2 friendships (one each side), 2 follows (one each side)
//
// Messages total 4: two in L1, one by player ID in L2, one by username in L2.
func seedFullUser(t *testing.T, db *gorm.DB) uuid.UUID {
	t.Helper()
	u := models.User{ID: uuid.New(), Email: "doomed@example.com", Username: doomedUsername}
	o := models.User{ID: uuid.New(), Email: "survivor@example.com", Username: survivorUsername}
	mustCreate(t, db, &u)
	mustCreate(t, db, &o)

	uSet := seedSetImages(t, db, u.ID, "doomed", 6)
	oSet := seedSetImages(t, db, o.ID, "survivor", 6)
	mustCreate(t, db, &models.SetCategory{SetID: uSet.ID, Category: models.CategoryAnime})
	mustCreate(t, db, &models.SetLike{UserID: o.ID, SetID: uSet.ID})
	mustCreate(t, db, &models.SetReport{UserID: o.ID, SetID: uSet.ID, Reason: models.ReportReasonSpam})
	mustCreate(t, db, &models.SetLike{UserID: u.ID, SetID: oSet.ID})
	mustCreate(t, db, &models.SetReport{UserID: u.ID, SetID: oSet.ID, Reason: models.ReportReasonOffensive})
	if err := db.Model(&models.CharacterSet{}).Where("id = ?", oSet.ID).Update("report_count", 3).Error; err != nil {
		t.Fatal(err)
	}

	// L1: hosted by the doomed user, survivor plays in it.
	l1 := seedLobby(t, db, u.ID, uSet.ID, "DOOM1")
	mustCreate(t, db, &models.LobbyCharacter{LobbyID: l1.ID, Name: "lc", Image: r2URL("doomed-char0.png")})
	pu1 := seedPlayer(t, db, l1.ID, u.ID, uuid.Nil)
	po1 := seedPlayer(t, db, l1.ID, o.ID, uuid.Nil)
	seedMessage(t, db, l1.ID, pu1.ID.String(), doomedUsername)
	seedMessage(t, db, l1.ID, po1.ID.String(), survivorUsername)

	// L2: hosted by survivor, doomed user plays in it.
	l2 := seedLobby(t, db, o.ID, oSet.ID, "SURV1")
	pu2 := seedPlayer(t, db, l2.ID, u.ID, uuid.Nil)
	po2 := seedPlayer(t, db, l2.ID, o.ID, uuid.Nil)
	seedMessage(t, db, l2.ID, pu2.ID.String(), "renamed-later")
	seedMessage(t, db, l2.ID, uuid.New().String(), doomedUsername)
	seedMessage(t, db, l2.ID, po2.ID.String(), survivorUsername)

	mustCreate(t, db, &models.Session{UserID: u.ID, ExpiresAt: time.Now().Add(time.Hour)})
	mustCreate(t, db, &models.Session{UserID: o.ID, ExpiresAt: time.Now().Add(time.Hour)})

	uid, oid := u.ID, o.ID
	mustCreate(t, db, &models.GameRecord{UserID: u.ID, LobbyID: l1.ID, OpponentName: survivorUsername, OpponentUserID: &oid, Result: models.ResultWin, CharacterSetID: uSet.ID, CharacterSetName: "doomed", FinishedAt: time.Now()})
	mustCreate(t, db, &models.GameRecord{UserID: o.ID, LobbyID: l1.ID, OpponentName: doomedUsername, OpponentUserID: &uid, Result: models.ResultLoss, CharacterSetID: uSet.ID, CharacterSetName: "doomed", FinishedAt: time.Now()})

	mustCreate(t, db, &models.Friendship{RequesterID: u.ID, AddresseeID: o.ID, Status: models.FriendshipAccepted})
	mustCreate(t, db, &models.Friendship{RequesterID: uuid.New(), AddresseeID: u.ID, Status: models.FriendshipPending})
	mustCreate(t, db, &models.Follow{FollowerID: u.ID, CreatorID: o.ID})
	mustCreate(t, db, &models.Follow{FollowerID: o.ID, CreatorID: u.ID})

	mustCreate(t, db, &models.PollVote{PollID: "friends", UserID: u.ID, OptionKey: "yes"})
	mustCreate(t, db, &models.GameFeedback{ID: uuid.New(), LobbyID: l1.ID, UserID: u.ID, Rating: 5})

	return u.ID
}

func userByUsername(t *testing.T, db *gorm.DB, username string) models.User {
	t.Helper()
	var u models.User
	if err := db.First(&u, "username = ?", username).Error; err != nil {
		t.Fatalf("load %s: %v", username, err)
	}
	return u
}

func countWhere(t *testing.T, db *gorm.DB, table, where string, args ...interface{}) int64 {
	t.Helper()
	var n int64
	if err := db.Table(table).Where(where, args...).Count(&n).Error; err != nil {
		t.Fatal(err)
	}
	return n
}

func TestDeleteAccount_RemovesEverything(t *testing.T) {
	db := openTestDB(t)
	uid := seedFullUser(t, db)
	var playerIDs []string
	if err := db.Table("players").Where("user_id = ? OR guest_id = ?", uid, uid).Pluck("id", &playerIDs).Error; err != nil {
		t.Fatal(err)
	}
	var hosted []uuid.UUID
	if err := db.Table("lobbies").Where("user_id = ?", uid).Pluck("id", &hosted).Error; err != nil {
		t.Fatal(err)
	}
	var setIDs []uuid.UUID
	if err := db.Table("character_sets").Where("user_id = ?", uid).Pluck("id", &setIDs).Error; err != nil {
		t.Fatal(err)
	}

	fs := &fakeStore{}
	svc := &AccountDeletionService{DB: db, Images: &ImageCleaner{DB: db, Store: fs}}
	if err := svc.Delete(uid); err != nil {
		t.Fatal(err)
	}

	for _, tbl := range []string{"players", "sessions", "game_records", "set_likes", "set_reports", "poll_votes", "game_feedbacks", "character_sets"} {
		if n := countRows(t, db, tbl, "user_id", uid); n != 0 {
			t.Errorf("%s has %d rows for user", tbl, n)
		}
	}
	if n := countWhere(t, db, "game_states", "player_id IN ?", playerIDs); n != 0 {
		t.Errorf("game_states has %d rows for user's players", n)
	}
	if n := countWhere(t, db, "stored_messages", "sender_id IN ? OR username = ?", playerIDs, doomedUsername); n != 0 {
		t.Errorf("stored_messages has %d rows from user", n)
	}
	if n := countWhere(t, db, "friendships", "requester_id = ? OR addressee_id = ?", uid, uid); n != 0 {
		t.Errorf("friendships has %d rows", n)
	}
	if n := countWhere(t, db, "follows", "follower_id = ? OR creator_id = ?", uid, uid); n != 0 {
		t.Errorf("follows has %d rows", n)
	}
	if n := countRows(t, db, "game_records", "opponent_user_id", uid); n != 0 {
		t.Errorf("game_records still reference user as opponent: %d", n)
	}
	if n := countRows(t, db, "users", "id", uid); n != 0 {
		t.Errorf("user row still exists")
	}

	// Hosted lobby and everything in it, including the other player's rows.
	for _, tbl := range []string{"lobby_characters", "game_states", "players"} {
		if n := countWhere(t, db, tbl, "lobby_id IN ?", hosted); n != 0 {
			t.Errorf("%s has %d rows in hosted lobby", tbl, n)
		}
	}
	if n := countWhere(t, db, "stored_messages", "lobby_id IN ?", uuidStrings(hosted)); n != 0 {
		t.Errorf("stored_messages has %d rows in hosted lobby", n)
	}
	if n := countWhere(t, db, "lobbies", "id IN ?", hosted); n != 0 {
		t.Errorf("hosted lobby still exists")
	}

	// Set children.
	for _, tbl := range []string{"characters", "set_categories", "set_likes", "set_reports"} {
		if n := countWhere(t, db, tbl, "set_id IN ?", setIDs); n != 0 {
			t.Errorf("%s has %d rows for user's sets", tbl, n)
		}
	}

	sort.Strings(fs.keys)
	want := []string{"doomed-char0.png", "doomed-char1.png", "doomed-char2.png", "doomed-char3.png", "doomed-char4.png", "doomed-char5.png", "doomed-cover.png"}
	if fmt.Sprint(fs.keys) != fmt.Sprint(want) {
		t.Fatalf("keys = %v, want %v", fs.keys, want)
	}
}

func TestDeleteAccount_LeavesOtherUsersIntact(t *testing.T) {
	db := openTestDB(t)
	uid := seedFullUser(t, db)
	other := userByUsername(t, db, survivorUsername)

	svc := &AccountDeletionService{DB: db, Images: &ImageCleaner{DB: db, Store: &fakeStore{}}}
	if err := svc.Delete(uid); err != nil {
		t.Fatal(err)
	}

	if n := countRows(t, db, "users", "id", other.ID); n != 1 {
		t.Fatalf("survivor user rows = %d", n)
	}
	var oSet models.CharacterSet
	if err := db.First(&oSet, "user_id = ?", other.ID).Error; err != nil {
		t.Fatalf("survivor set: %v", err)
	}
	if n := countRows(t, db, "characters", "set_id", oSet.ID); n != 6 {
		t.Fatalf("survivor characters = %d", n)
	}
	if oSet.ReportCount != 2 {
		t.Fatalf("survivor set report_count = %d, want 2", oSet.ReportCount)
	}
	if n := countRows(t, db, "sessions", "user_id", other.ID); n != 1 {
		t.Fatalf("survivor sessions = %d", n)
	}
	var survivorLobby models.Lobby
	if err := db.First(&survivorLobby, "user_id = ?", other.ID).Error; err != nil {
		t.Fatalf("survivor lobby: %v", err)
	}
	if n := countRows(t, db, "players", "lobby_id", survivorLobby.ID); n != 1 {
		t.Fatalf("survivor lobby players = %d", n)
	}
	if n := countWhere(t, db, "stored_messages", "lobby_id = ? AND username = ?", survivorLobby.ID.String(), survivorUsername); n != 1 {
		t.Fatalf("survivor messages in own lobby = %d", n)
	}

	var rec models.GameRecord
	if err := db.First(&rec, "user_id = ?", other.ID).Error; err != nil {
		t.Fatalf("survivor game record: %v", err)
	}
	if rec.OpponentName != "Deleted user" {
		t.Fatalf("opponent_name = %q", rec.OpponentName)
	}
	if rec.OpponentUserID != nil {
		t.Fatalf("opponent_user_id = %v", *rec.OpponentUserID)
	}
}

func TestDeleteAccount_MessagesByPlayerID(t *testing.T) {
	db := openTestDB(t)
	u := models.User{ID: uuid.New(), Email: "a@example.com", Username: "alice"}
	host := models.User{ID: uuid.New(), Email: "b@example.com", Username: "bob"}
	mustCreate(t, db, &u)
	mustCreate(t, db, &host)
	set := seedSetImages(t, db, host.ID, "bob", 6)
	lobby := seedLobby(t, db, host.ID, set.ID, "BOB01")
	p := seedPlayer(t, db, lobby.ID, u.ID, uuid.Nil)
	// Username differs from the account's, so only the player-ID match can catch it.
	msg := seedMessage(t, db, lobby.ID, p.ID.String(), "display-name")
	hostP := seedPlayer(t, db, lobby.ID, host.ID, uuid.Nil)
	hostMsg := seedMessage(t, db, lobby.ID, hostP.ID.String(), "bob")

	svc := &AccountDeletionService{DB: db}
	if err := svc.Delete(u.ID); err != nil {
		t.Fatal(err)
	}
	if n := countRows(t, db, "stored_messages", "id", msg.ID); n != 0 {
		t.Fatal("message by player ID survived")
	}
	if n := countRows(t, db, "stored_messages", "id", hostMsg.ID); n != 1 {
		t.Fatal("host message was deleted")
	}
	if n := countRows(t, db, "lobbies", "id", lobby.ID); n != 1 {
		t.Fatal("non-hosted lobby was deleted")
	}
	if n := countRows(t, db, "players", "id", p.ID); n != 0 {
		t.Fatal("player survived")
	}
	if n := countRows(t, db, "game_states", "player_id", p.ID); n != 0 {
		t.Fatal("game state survived")
	}
}

func TestDeleteAccount_Guest(t *testing.T) {
	db := openTestDB(t)
	g := models.User{ID: uuid.New(), IsGuest: true}
	host := models.User{ID: uuid.New(), Email: "h@example.com", Username: "host"}
	mustCreate(t, db, &g)
	mustCreate(t, db, &host)
	mustCreate(t, db, &models.Session{UserID: g.ID, IsGuest: true, ExpiresAt: time.Now().Add(time.Hour)})
	mustCreate(t, db, &models.Session{UserID: g.ID, IsGuest: true, ExpiresAt: time.Now().Add(time.Hour)})

	set := seedSetImages(t, db, host.ID, "host", 6)
	lobby := seedLobby(t, db, host.ID, set.ID, "HOST1")
	// Guests are stored in guest_id, as LobbyService does.
	p := seedPlayer(t, db, lobby.ID, uuid.Nil, g.ID)
	msg := seedMessage(t, db, lobby.ID, p.ID.String(), "Guest")
	// A guest-hosted lobby.
	gLobby := models.Lobby{ID: uuid.New(), GuestID: g.ID, Code: "GUEST", CharacterSetID: set.ID}
	mustCreate(t, db, &gLobby)
	gp := seedPlayer(t, db, gLobby.ID, uuid.Nil, g.ID)
	// A message in the guest-hosted lobby from someone else: matched only by lobby_id.
	gLobbyMsg := seedMessage(t, db, gLobby.ID, uuid.New().String(), "visitor")
	// Another guest's message with the same display name must survive.
	other := seedMessage(t, db, lobby.ID, uuid.New().String(), "Guest")

	svc := &AccountDeletionService{DB: db}
	preview, err := svc.Preview(g.ID)
	if err != nil {
		t.Fatal(err)
	}
	if preview.Sessions != 2 || preview.HostedLobbies != 1 || preview.Messages != 2 {
		t.Fatalf("preview = %+v", preview)
	}
	if err := svc.Delete(g.ID); err != nil {
		t.Fatal(err)
	}
	if n := countRows(t, db, "users", "id", g.ID); n != 0 {
		t.Fatal("guest user survived")
	}
	if n := countRows(t, db, "sessions", "user_id", g.ID); n != 0 {
		t.Fatalf("sessions = %d", n)
	}
	if n := countWhere(t, db, "players", "id IN ?", []uuid.UUID{p.ID, gp.ID}); n != 0 {
		t.Fatalf("players = %d", n)
	}
	if n := countWhere(t, db, "game_states", "player_id IN ?", []uuid.UUID{p.ID, gp.ID}); n != 0 {
		t.Fatalf("game_states = %d", n)
	}
	if n := countRows(t, db, "lobbies", "id", gLobby.ID); n != 0 {
		t.Fatal("guest-hosted lobby survived")
	}
	if n := countRows(t, db, "stored_messages", "id", msg.ID); n != 0 {
		t.Fatal("guest message survived")
	}
	if n := countRows(t, db, "stored_messages", "id", gLobbyMsg.ID); n != 0 {
		t.Fatal("message in guest-hosted lobby survived")
	}
	if n := countRows(t, db, "stored_messages", "id", other.ID); n != 1 {
		t.Fatal("other guest's message was deleted")
	}
	if n := countRows(t, db, "lobbies", "id", lobby.ID); n != 1 {
		t.Fatal("host lobby was deleted")
	}
}

func TestDeleteAccount_UnknownUser(t *testing.T) {
	db := openTestDB(t)
	svc := &AccountDeletionService{DB: db}
	if err := svc.Delete(uuid.New()); !errors.Is(err, ErrUserNotFound) {
		t.Fatalf("Delete err = %v", err)
	}
	if _, err := svc.Preview(uuid.New()); !errors.Is(err, ErrUserNotFound) {
		t.Fatalf("Preview err = %v", err)
	}
	if err := svc.Delete(uuid.Nil); !errors.Is(err, ErrUserNotFound) {
		t.Fatalf("Delete(nil) err = %v", err)
	}
}

func TestPreview_Counts(t *testing.T) {
	db := openTestDB(t)
	uid := seedFullUser(t, db)
	svc := &AccountDeletionService{DB: db}
	got, err := svc.Preview(uid)
	if err != nil {
		t.Fatal(err)
	}
	want := DeletionPreview{
		Username:      doomedUsername,
		Email:         "doomed@example.com",
		Sets:          1,
		Characters:    6,
		Images:        7,
		GameRecords:   1,
		Friendships:   2,
		Follows:       2,
		Likes:         1,
		Reports:       1,
		PollVotes:     1,
		Feedback:      1,
		Messages:      4,
		Sessions:      1,
		HostedLobbies: 1,
	}
	if *got != want {
		t.Fatalf("preview = %+v\nwant      %+v", *got, want)
	}
	// Preview must not change anything.
	if n := countRows(t, db, "users", "id", uid); n != 1 {
		t.Fatal("preview deleted the user")
	}
}

func TestDeleteAccount_UsernameFallbackScopedToPlayedLobbies(t *testing.T) {
	db := openTestDB(t)
	// A registered user who picked the same name guests display as.
	u := models.User{ID: uuid.New(), Email: "g@example.com", Username: "Guest"}
	host := models.User{ID: uuid.New(), Email: "h@example.com", Username: "host"}
	mustCreate(t, db, &u)
	mustCreate(t, db, &host)
	set := seedSetImages(t, db, host.ID, "host", 6)

	played := seedLobby(t, db, host.ID, set.ID, "PLAY1")
	seedPlayer(t, db, played.ID, u.ID, uuid.Nil)
	// Sender no longer matches any player row: only the username fallback catches it.
	fallbackMsg := seedMessage(t, db, played.ID, uuid.New().String(), "Guest")

	unrelated := seedLobby(t, db, host.ID, set.ID, "OTHER")
	guestP := seedPlayer(t, db, unrelated.ID, uuid.Nil, uuid.New())
	guestMsg := seedMessage(t, db, unrelated.ID, guestP.ID.String(), "Guest")

	svc := &AccountDeletionService{DB: db}
	preview, err := svc.Preview(u.ID)
	if err != nil {
		t.Fatal(err)
	}
	if preview.Messages != 1 {
		t.Fatalf("preview messages = %d, want 1", preview.Messages)
	}
	if err := svc.Delete(u.ID); err != nil {
		t.Fatal(err)
	}
	if n := countRows(t, db, "stored_messages", "id", fallbackMsg.ID); n != 0 {
		t.Fatal("username-matched message in played lobby survived")
	}
	if n := countRows(t, db, "stored_messages", "id", guestMsg.ID); n != 1 {
		t.Fatal("another guest's message in an unrelated lobby was deleted")
	}
}

func TestDeleteAccount_UsernameFallbackSkippedWithoutPlayers(t *testing.T) {
	db := openTestDB(t)
	u := models.User{ID: uuid.New(), Email: "a@example.com", Username: "Anonymous"}
	host := models.User{ID: uuid.New(), Email: "h@example.com", Username: "host"}
	mustCreate(t, db, &u)
	mustCreate(t, db, &host)
	set := seedSetImages(t, db, host.ID, "host", 6)
	lobby := seedLobby(t, db, host.ID, set.ID, "ANON1")
	anonMsg := seedMessage(t, db, lobby.ID, uuid.New().String(), "Anonymous")

	svc := &AccountDeletionService{DB: db}
	if err := svc.Delete(u.ID); err != nil {
		t.Fatal(err)
	}
	if n := countRows(t, db, "stored_messages", "id", anonMsg.ID); n != 1 {
		t.Fatal("anonymous message deleted for a user with no player rows")
	}
}

func TestDeleteAccount_InvalidatesSetCache(t *testing.T) {
	db := openTestDB(t)
	uid := seedFullUser(t, db)
	second := seedSetImages(t, db, uid, "doomed2", 6)
	other := userByUsername(t, db, survivorUsername)
	var oSet models.CharacterSet
	if err := db.First(&oSet, "user_id = ?", other.ID).Error; err != nil {
		t.Fatal(err)
	}
	var setIDs []uuid.UUID
	if err := db.Table("character_sets").Where("user_id = ?", uid).Pluck("id", &setIDs).Error; err != nil {
		t.Fatal(err)
	}
	if len(setIDs) != 2 {
		t.Fatalf("seeded sets = %v", setIDs)
	}

	cache := &fakeSetCache{data: map[uuid.UUID]CharacterSetResponse{}}
	for _, id := range append(setIDs, oSet.ID) {
		cache.data[id] = CharacterSetResponse{}
	}
	svc := &AccountDeletionService{DB: db, Cache: cache}
	if err := svc.Delete(uid); err != nil {
		t.Fatal(err)
	}
	if cache.invalidateCalls != 2 {
		t.Fatalf("invalidateCalls = %d, want 2", cache.invalidateCalls)
	}
	for _, id := range setIDs {
		if _, ok := cache.data[id]; ok {
			t.Errorf("set %s still cached", id)
		}
	}
	if _, ok := cache.data[second.ID]; ok {
		t.Errorf("second set still cached")
	}
	if _, ok := cache.data[oSet.ID]; !ok {
		t.Errorf("survivor's set was invalidated")
	}
}
