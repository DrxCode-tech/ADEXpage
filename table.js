function highlightCell(day, start) {
    document.querySelectorAll('.cell').forEach(c => c.classList.remove("glow"));

    const id = `${day}-${start}`;
    const active = document.getElementById(id);

    if (active) {
        active.classList.add("glow");
    }
}

function checkAttendanceState() {
    const dayIndex = new Date().getDay(); // 0-6
    const hour = new Date().getHours();

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const day = days[dayIndex];

    switch (dayIndex) {
        case 1:
            if (hour >= 8 && hour < 10) highlightCell("Mon", 8);
            else if (hour >= 12 && hour < 14) highlightCell("Mon", 12);
            break;

        case 2:
            if (hour >= 8 && hour < 10) highlightCell("Tue", 8);
            else if (hour >= 10 && hour < 12) highlightCell("Tue", 10);
            else if (hour >= 12 && hour < 14) highlightCell("Tue", 12);
            else if (hour >= 14 && hour < 15) highlightCell("Tue", 14);
            else if (hour >= 15 && hour < 17) highlightCell("Tue", 15);
            break;

        case 3:
            if (hour >= 8 && hour < 10) highlightCell("Wed", 8);
            else if (hour >= 10 && hour < 11) highlightCell("Wed", 10);
            else if (hour >= 13 && hour < 14) highlightCell("Wed", 12);
            else if (hour >= 14 && hour < 16) highlightCell("Wed", 14);
            else if (hour >= 16 && hour < 21) highlightCell("Wed", 16);
            break;

        case 4:
            if (hour >= 9 && hour < 11) highlightCell("Thu", 9);
            else if (hour >= 12 && hour < 14) highlightCell("Thu", 12);
            else if (hour >= 14 && hour < 16) highlightCell("Thu", 14);
            else if (hour >= 16 && hour < 17) highlightCell("Thu", 16);
            break;

        case 7:
            if (hour >= 2 && hour < 9) highlightCell("Fri", 2);
            else if (hour >= 9 && hour < 10) highlightCell("Fri", 9);
            else if (hour >= 10 && hour < 11) highlightCell("Fri", 10);
            else if (hour >= 11 && hour < 13) highlightCell("Fri", 12);
            else if (hour >= 14 && hour < 15) highlightCell("Fri", 14);
            else if (hour >= 15 && hour < 17) highlightCell("Fri", 15);
            break;

        default:
            console.log("Weekend – no classes");
    }
}

setInterval(checkAttendanceState, 2000);
checkAttendanceState();
