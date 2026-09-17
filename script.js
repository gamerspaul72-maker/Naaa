class FlipBook {
    constructor(bookElem) {
        this.elems = {
            book: bookElem,
            leaves: bookElem.querySelectorAll(".leaf")
        };

        this.currentPagePosition = 0;
        this.isAnimating = false;

        // Timing of a real page turn: a quick lift off the stack,
        // then a slower arc as it rotates and settles back down.
        this.liftDuration = 150;
        this.turnDuration = 900;

        this.setupEvents();
        this.turnPage(0, true); // lay everything out instantly on load
    }

    setLeafPosition(leaf, position, index, instant) {
        const turned = position < 0;
        const rotation = turned ? -180 : 0;
        const depth = (position < 0 ? 1 : -1) * Math.abs(index);
        const wasTurned = leaf.dataset.turned === "true";
        const flipping = !instant && wasTurned !== turned;

        // Stacking order only depends on which side a leaf is on and
        // how deep it is in that pile, so it stays correct at all times.
        leaf.style.zIndex = turned
            ? index + 1
            : this.elems.leaves.length - index;

        if (instant) {
            leaf.style.transition = "none";
            leaf.style.transform = `translate3d(0,0,${depth}px) rotate3d(0,1,0,${rotation}deg)`;
            // force layout so the "none" transition is applied before we restore it
            void leaf.offsetWidth;
            leaf.style.transition = "";
        } else if (flipping) {
            const liftDepth = depth + 45;
            leaf.classList.add("flipping");

            // Phase 1: the page lifts slightly off the stack before turning.
            leaf.style.transition = `transform ${this.liftDuration}ms ease-out`;
            leaf.style.transform = `translate3d(0,0,${liftDepth}px) rotate3d(0,1,0,${wasTurned ? -180 : 0}deg)`;

            const startTurn = (e) => {
                if (e && e.propertyName && e.propertyName !== "transform") return;
                leaf.removeEventListener("transitionend", startTurn);

                // Phase 2: the actual turn, arcing back down as it rotates.
                leaf.style.transition = `transform ${this.turnDuration}ms cubic-bezier(0.645, 0.045, 0.355, 1)`;
                leaf.style.transform = `translate3d(0,0,${depth}px) rotate3d(0,1,0,${rotation}deg)`;
                this.animateShade(leaf, this.turnDuration);

                const finish = (ev) => {
                    if (ev && ev.propertyName && ev.propertyName !== "transform") return;
                    leaf.removeEventListener("transitionend", finish);
                    leaf.classList.remove("flipping");
                };
                leaf.addEventListener("transitionend", finish);
            };
            leaf.addEventListener("transitionend", startTurn);
        } else {
            // Depth-only shift (a page settling deeper into a pile), no flip.
            leaf.style.transition = "transform 450ms ease";
            leaf.style.transform = `translate3d(0,0,${depth}px) rotate3d(0,1,0,${rotation}deg)`;
        }

        leaf.dataset.turned = turned;
        leaf.classList.toggle("turned", turned);
    }

    // Simulates light grazing through the paper as it turns: a soft
    // shadow that grows toward the middle of the flip and fades again.
    animateShade(leaf, duration) {
        const start = performance.now();
        const step = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const shade = Math.sin(t * Math.PI);
            leaf.style.setProperty("--shade", shade.toFixed(3));
            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                leaf.style.setProperty("--shade", 0);
            }
        };
        requestAnimationFrame(step);
    }

    turnPage(delta, instant) {
        if (this.isAnimating && !instant) return;

        const next = this.currentPagePosition + delta;
        if (next < 0 || next > this.elems.leaves.length) return;

        this.currentPagePosition = next;
        this.isAnimating = true;

        this.elems.leaves.forEach((leaf, index) => {
            this.setLeafPosition(leaf, index - this.currentPagePosition, index, instant);
        });

        this.elems.book.classList.toggle("is-open", this.currentPagePosition > 0);
        this.elems.book.classList.toggle("is-final", this.currentPagePosition === this.elems.leaves.length);

        const totalDuration = instant ? 0 : this.liftDuration + this.turnDuration + 60;
        window.setTimeout(() => {
            this.isAnimating = false;
        }, totalDuration);
    }

    setupEvents() {
        this.elems.book.addEventListener("click", (event) => {
            const bookBounds = this.elems.book.getBoundingClientRect();
            const clickedLeftSide = event.clientX < bookBounds.left + bookBounds.width / 2;
            this.turnPage(clickedLeftSide ? -1 : 1);
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "ArrowRight") this.turnPage(1);
            if (e.key === "ArrowLeft") this.turnPage(-1);
        });
    }
}

var flipBook = new FlipBook(document.getElementById("flipbook"));
