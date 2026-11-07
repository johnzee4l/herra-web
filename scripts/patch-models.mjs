import { readFileSync, writeFileSync } from "node:fs";

const p = "components/admin/Models.tsx";
let s = readFileSync(p, "utf8");

const tail = `              </div>
              <Btn cls="secondary" sz="sm" icon="Pulse" disabled={!!busy[k]} onClick={() => test(k)}>
                {busy[k] ? "Testing…" : "Test now"}
              </Btn>
            </div>
          );
        })}
      </div>
    </AdminPage>
  );
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
`;

writeFileSync(p, s + tail, "utf8");
console.log("new length", readFileSync(p, "utf8").length);
