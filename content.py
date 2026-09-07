#!/usr/bin/env python3
"""Everything a person might want to change lives here.

`build.py` is a generator and holds no copy of its own.

⚠️  CONCEPT BUILD. The company name is real; the phone number, email and the
    "demos delivered" figure are placeholders. Swap them at the top of this
    file and rebuild — nothing else needs touching.
"""

# ----------------------------------------------------------------- flags ---
NOINDEX = True            # never let a concept compete with the real site
SHOW_CONCEPT_NOTE = True  # the "placeholder details" line in the footer

# ----------------------------------------------------------------- brand ---
NAME = "Veebros"
LEGAL_NAME = "Veebros Info Solutions"
DESCRIPTION = ("Send us an idea. We send back a working demo in 48 hours, "
               "free. Approve it, build from it, or walk away.")

# ⚠️ PLACEHOLDERS — replace with the real numbers.
PHONE = "+91 90000 00000"
PHONE_LINK = "+919000000000"
WHATSAPP = "919000000000"
EMAIL = "hello@veebros.com"
LOCATION = "Chennai, India"

# --------------------------------------------------------------- the hero ---
# Who we are. No field here — the page introduces itself before it asks for
# anything.
HERO_KICKER = "Veebros &middot; Product studio"
# The <title> needs plain text, not markup — kickers carry entities.
PAGE_TITLE = "Veebros — We bring anything to life"
HERO_TITLE = "We bring anything<br>to life."
HERO_SUB = ("From a sentence in your head to software you can open on your "
            "phone. If you can describe it, we can build it &mdash; and we "
            "will show you before you decide anything.")
HERO_CTA = "Start an idea"
HERO_CTA_2 = "See how"

WHO = [
    ("Anything you can describe",
     "Apps, dashboards, marketplaces, internal tools, the awkward thing that "
     "does not have a category yet."),
    ("We show you the product demo",
     "You get working software back, not a deck. That is the whole difference "
     "and it changes every conversation."),
    ("Fast enough to change your mind",
     "Two days from idea to something real means being wrong costs almost "
     "nothing."),
]

# ------------------------------------------------------------- the machine ---
MACHINE_KICKER = "Watch one get built"
MACHINE_TITLE = "Type an idea. See its shape."
MACHINE_SUB = ("This is a rough sketch, assembled in your browser in about "
               "four seconds. The real one takes us forty-eight hours and it "
               "is free.")

INPUT_LABEL = "What do you want to build?"
INPUT_PLACEHOLDER = "a booking system for my dental clinic"

# Prompts under the input so nobody faces a blank field.
SEEDS = [
    "a booking system for my dental clinic",
    "a marketplace for renting camera gear",
    "an internal dashboard for our sales team",
    "an app to track my gym progress",
    "a storefront for my bakery",
    "a course platform for my students",
]

# What the machine says while it assembles.
BUILD_STEPS = [
    "Reading the idea",
    "Choosing a structure",
    "Laying out screens",
    "Placing components",
    "Applying the brand",
]

AFTER_BUILD_TITLE = "That took four seconds."
AFTER_BUILD_BODY = (
    "It&rsquo;s a rough shape, assembled in your browser from a pattern we "
    "know well. Yours gets built properly &mdash; real screens, real data, "
    "a link you can open on your phone and hand to someone else."
)
AFTER_BUILD_CTA = "Get this built for real"

# ------------------------------------------------------------ the argument ---
THESIS_KICKER = "Why this way"
THESIS_TITLE = "You shouldn&rsquo;t have to buy software to find out whether you want it."
THESIS_BODY = [
    "Most software starts with a long conversation about something that does "
    "not exist yet. Documents, estimates, a signature &mdash; and everyone "
    "quietly hoping that the picture in your head matches the picture in ours.",
    "We would rather just show you. Send the idea over and in a couple of days "
    "there is something real to open on your phone: screens you can tap, a "
    "link you can hand to the people who will actually use it.",
    "If it is right, we build it properly. If it is not, you will know exactly "
    "why &mdash; and you will have found out the easy way, over a chat, with "
    "the thing in front of you.",
]

# ------------------------------------------------------------- the timeline ---
TIMELINE_KICKER = "How it goes"
TIMELINE_TITLE = "Forty-eight hours, start to finish."
TIMELINE = [
    ("00:00", "You send the idea",
     "A paragraph is plenty. A sketch on a napkin is plenty. You do not need "
     "a spec, and you do not need to know what it is called."),
    ("02:00", "We ask two questions",
     "Usually only two. Who uses it, and what has to be true for it to be "
     "worth having. Not a discovery phase &mdash; a short message."),
    ("08:00", "The shape appears",
     "Screens, flow, the handful of decisions that matter. This is where a "
     "traditional project would still be writing a proposal."),
    ("24:00", "It becomes real",
     "Working screens with real behaviour. Things you can tap. Not a "
     "clickable picture &mdash; software."),
    ("48:00", "A link lands in your inbox",
     "Open it, use it, send it to someone. Then tell us to build it "
     "properly, take the demo and go elsewhere, or say nothing at all."),
]

# ---------------------------------------------------------------- capability ---
RANGE_KICKER = "Range"
RANGE_TITLE = "If you can describe it, it can be demoed."
RANGE_BODY = ("These are the shapes we build most. The machine above knows "
              "all of them &mdash; try one.")

# (label, one-liner) — these double as the demo machine's archetype list.
RANGE = [
    ("Booking &amp; scheduling", "Calendars, slots, reminders, no-shows."),
    ("Marketplaces", "Two sides, listings, matching, payouts."),
    ("Internal dashboards", "The numbers your team argues about, in one place."),
    ("Storefronts", "Catalogue, cart, checkout, orders."),
    ("Trackers &amp; logs", "Anything you currently keep in a spreadsheet."),
    ("Course platforms", "Lessons, progress, certificates."),
    ("CRM &amp; pipelines", "Leads that stop falling through gaps."),
    ("Clinic &amp; patient systems", "Appointments, records, follow-ups."),
    ("Delivery &amp; logistics", "Jobs, drivers, status, proof."),
    ("Invoicing &amp; billing", "Issue, chase, reconcile."),
    ("Community &amp; social", "Feeds, profiles, moderation."),
    ("Something not on this list", "Most of our work is this one."),
]

# ------------------------------------------------------------------- close ---
CLOSE_KICKER = "Your turn"
CLOSE_TITLE = "Send us something impossible."
CLOSE_BODY = "A wise man once said:"
CLOSE_QUOTE = ("We shall not cease from exploration, and the end of all our "
               "exploring will be to arrive where we started and know the "
               "place for the first time.")
CLOSE_CTA = "Start with an idea"

FAQ = [
    ("Is the demo really free?",
     "Yes, and there is no meeting attached to it. Send an idea, get a link "
     "back. If you never reply, that is a normal outcome and we are fine "
     "with it."),
    ("What do you need from me to start?",
     "A description of the idea and some way to reach you. That is the whole "
     "brief. If we need more we will ask, and it is usually one question."),
    ("What if the demo is wrong?",
     "Tell us and we will turn it around again. Being wrong in 48 hours is "
     "cheap, which is rather the point of doing it this way."),
    ("Do I own what you send me?",
     "The demo is yours. Take it to another developer if you like &mdash; "
     "we would rather you had something real than a proposal you cannot use."),
    ("What does the real build cost?",
     "It depends entirely on what the demo turns out to be, which is why we "
     "would rather quote after you have seen one than guess before."),
    ("How can it be this quick?",
     "Because we start by building instead of by documenting. Most of a "
     "traditional timeline is spent describing software to each other."),
]

FOOTER_NOTE = ("Concept build. The phone number, email address and delivery "
               "count are placeholders and need replacing.")

# Illustrative — replace or delete before this goes live.
DELIVERED = "40"
DELIVERED_LABEL = "demos delivered"
