SSH_ORIGINAL_COMMAND=gitea-internal REPO_USER=steve REPO_NAME=cluster-4 make -e repo-init

After installing, need to create the first repo / cluster...
Call it "CLUSTER-TEMPLATE".
Initialize the first cb-config.yaml using...
  SSH_ORIGINAL_COMMAND=gitea-internal \
    REPO_USER=steve \
    REPO_NAME=CLUSTER-TEMPLATE \
    make -e repo-init
Then, use...
  sqlite3 ./data/gitea.db
  update repository set is_empty = 0 WHERE id = 1;
The CLUSTER-TEMPLATE should have repository.id == 1.
Then, use the web UI to set the CLUSTER-TEMPLATE's
  settings to a template cluster.


-------
[Macaron] 2020-10-04 11:18:53: Completed GET /api/v1/repos/search?q=&template=true&priority_owner_id=1&_=1601835492979 200 OK in 1.317376ms


-------
PREFIX-userOrg__repo__branch__nameOptional
  plus label / annotation

cbs-steve__cluster-1__master__

cb-config.yaml
  => cb-config-plan (JS, w/ catalog input, also validates)
  => cb-config-ui   (JS, w/ catalog input,
                     uses cb-config-plan)

  => cb-config-approve (billing workflow)

  => cbs-reconcile (uses cb-config-check)
       -catalog ./catalog
       -name-prefix cbs
       -name steve/cluster-1/master
       -labels git-ref=g12344321,git-userOrg=steve,git-repo=cluster-1,git-branch=master
       cb-config.yaml
     => cbs-config.yaml
        => kubectl create -f -
        => kubectl replace -f -

  => cbs-reconcile-workers

=> kubectl delete -f -

kubectl get
kubectl describe
  => cb-status'es


which k8s cluster?
  ans: whatever the local kubectl uses,
       so, 1-to-1 between k8s cluster+namespace to giteax instance.
       future: run multiple giteax instances,
               with user based smart LB in front?
               - but, what about teams that cross multiple users --
                 would need to gossip team membership?

which k8s cluster namespace?
  ans: by default, namespace is default.
       future: possible one-time, immutable namespace
               to use defined at giteax install time?

but, might be too limiting, in that you might one day want
  one pane-of-glass for entire multi-hybrid-cloud world?
  so, there would be a default cluster & namespace,
  but the YAML could specify multi/hybrid cloud topologies.






% kubectl replace -f ~/Desktop/cao-1.yaml
secret/cb-secret replaced
couchbasecluster.couchbase.com/cb-cluster replaced

% kubectl describe couchbaseclusters/cb-cluster
Name:         cb-cluster
Namespace:    default
Labels:       <none>
Annotations:  <none>
API Version:  couchbase.com/v2
Kind:         CouchbaseCluster
Metadata:
  Creation Timestamp:  2020-09-27T00:03:36Z
  Generation:          2682
  Resource Version:    174429
  Self Link:           /apis/couchbase.com/v2/namespaces/default/couchbaseclusters/cb-cluster
  UID:                 92858905-96a5-4a61-9b49-bf5b253ad739
Spec:
  Backup:
  Buckets:
  Cluster:
    Analytics Service Memory Quota:  1Gi
    Auto Compaction:
      Database Fragmentation Threshold:
        Percent:  30
      Time Window:
      Tombstone Purge Interval:  72h0m0s
      View Fragmentation Threshold:
        Percent:                                    30
    Auto Failover Max Count:                        3
    Auto Failover On Data Disk Issues Time Period:  2m0s
    Auto Failover Timeout:                          2m0s
    Data Service Memory Quota:                      256Mi
    Eventing Service Memory Quota:                  256Mi
    Index Service Memory Quota:                     256Mi
    Index Storage Setting:                          memory_optimized
    Search Service Memory Quota:                    256Mi
  Image:                                            couchbase/server:6.6.0
  Logging:
  Networking:
    Admin Console Service Type:  NodePort
    Admin Console Services:
      data
    Expose Admin Console:          true
    Exposed Feature Service Type:  NodePort
  Security:
    Admin Secret:  cb-secret
    Rbac:
  Security Context:
    Fs Group:  1000
  Servers:
    Name:  cb-servers-1
    Resources:
    Services:
      data
      index
      query
      search
    Size:                         1
  Software Update Notifications:  false
  Xdcr:
Status:
  Cluster Id:  e0288d39e33946456f9b546c5a6fc3e6
  Conditions:
    Last Transition Time:  2020-09-27T00:33:08Z
    Last Update Time:      2020-09-27T00:33:08Z
    Message:               Data is equally distributed across all nodes in the cluster
    Reason:                Balanced
    Status:                True
    Type:                  Balanced
    Last Transition Time:  2020-09-27T00:33:07Z
    Last Update Time:      2020-09-27T00:33:07Z
    Reason:                Available
    Status:                True
    Type:                  Available
  Current Version:         6.6.0
  Members:
    Ready:
      cb-cluster-0000
  Phase:  Running
  Size:   1
Events:
  Type    Reason          Age   From  Message
  ----    ------          ----  ----  -------
  Normal  ServiceCreated  29m         Service for admin console `cb-cluster-ui` was created
  Normal  NewMemberAdded  29m         New member cb-cluster-0000 added to cluster

% kubectl get couchbaseclusters       
NAME         VERSION   SIZE   STATUS    UUID                               AGE
cb-cluster   6.6.0     1      Running   e0288d39e33946456f9b546c5a6fc3e6   31m



-----------------
On total guesswork on how many devs might be needed to stand up a hosted dbaas / saas?

And, backed by how many # of ops folks?

Classic engineering answer to build it would be...

...it depends.

Or, 4-8 great devs?

But... note that we hadn't strongly defined "it" :-)

And, had not really defined a strong "by when" :-)


Anyways, to break it down a bit, I was thinking abstractly of the high level subsystems that might be involved -- roughly, things like...

- accounts
- payment integrations
- service catalog
- the "shopping cart"
- the "order book"
- provisioner
- network proxies
- cloud vendor integration layer
- logging & metrics
- customer support systems

A lot of the above probably sound familiar -- where there's likely a bunch of parts in common with a subscription e-commerce app -- e.g., if you have an digital online subscription magazine or newsletter...

...they'd have features like monthly recurring payments (or 12 months annual discount) -- where you might have a lot of the bones already from open-source projects for the boring parts.

Here's one level more detail on those above subsystems -- just listing out what pops to mind...

accounts...
   signup, accounts, users, activations, 
   email confirmations, & resends,
   deactivations,
   cancellations and banning bad actors, bad emails, bad domains,
   account levels, ownership transfers,
   and groups...
   and GDPR's involved here, too.

payment integrations...
   recurring payments, refunds,
   credits, discount codes, grace periods,
   free trial periods, international pricing, 
   taxes & VAT, etc,
   and GDPR's also involved here, too.

the service catalog...
   a catalog of DB & cluster offerings
   and the feature knobs or options...
   (# nodes, mem size, storage size,
    # buckets, # collections, # replicas,
    network bandwidth, features, XDCR,
    # ops/sec, etc).

the "shopping cart"...
   i.e., the service configurator or cluster configurator.

the "order book" of accepted orders...
   which describes approved and wanted clusters and their feature details
   that need to be provisioned (or deprovisioned).

the provisioner & janitor subsystems...
   which are processes that would continually
   run in the background, which would strive
   to turn the order book into reality...
   even in the face of failures and reboots/restarts of servers, zones, regions, etc,
   and when parts just have timeouts (grey failures), along
   with backoffs and retries, along with throttling things.

related, there'd be jobs...
   to schedule, kickoff, and manage things that take a lot of time,
   like backups, restores, rolling upgrades, etc.

specialized network proxies...
   for couchbase protocols, to open/close the "front door" when
   a cluster has finally been provisioned,
   especially, if you want multi-node clusters --
   and features like handling trusted/allowed-IP lists.

cloud vendor integration layer...
   to protect from AWS-only lock-in...
   where multiples of these exist already, so got to find the right one.

logs & metrics...
   capturing raw logs to S3 (or equivalent),
   and then analysis, dashboards, reports, and red alert emails.

customer support systems...
  for tracking & workflow of tickets/tasks, notes, KB's.

all the above have cross-cutting engineering concerns, like...
  - data modeling...
  - UI (can be ugly if internal!)...
  - and tests...
    lots and lots of tests.

also, the above things might have open-source, off-the-shelf options, too...
  as "buy"+integrate > build.

besides the dev folks, you'd also need folks like...
- QE / testing,
- sysadmin/ops,
    even though we'd design to self-heal
    and have lights-out operations,
- customer support folks
    to answer the phone, emails, forums.

not all the above need to be there on a day-0 launch, of course.

for example, you might just start with a single cloud vendor,
   a single zone,
   a single version,
   a single item in the "product catalog"
   ...etc.

interesting sales "gates" for users might include wanting...
- multiple versions (not just the latest)
- multiple nodes (not just 1)
- more services (e.g., analytics)
- more memory
- more storage
- auto-expanding/elastic storage
- more buckets, collections
- more indexes
- wanting specific zones, regions, clouds
- wanting raw logs
- wanting SSH
- security
- auditing
- RBAC
- cbbackupmgr
- XDCR
- VPC
- max # of connections
- auto-failover

So, take all the above, divide by your "good-to-great developer" denominator.

You're definitely in the range of 4-8+ devs (plus whatever "reality multiplier" you have on top of that), since we're kinda ignoring time.

-----------------
from looking at mongodb atlas...

email registration
  fname, lname, company name, job function country
google 2FA account
terms of service
privacy policy

free tier never expire, subset of features
  4.2 only
  us-east-1 only
  no version upgrades
  upgraded by mongo 
  no memory config
  no storage size config
  replica count: 3
  replica set tags: no
  no sharded clster
  no backup on free tier M0
     but mongodump supported
  no failovers
  no db auditing
  no encryption at rest
  no network peer connections
  no db access history
  throughput
    m0 - 100/sec
    m2 - 200/sec
    m5 - 500/sec
  sort in memory limit: 32MB
  query utilization limits
  conns: max 500
  server side JS: no
  clusters API: no
  max # of M0's per atlas project: 1
  db command limitations
  monitoring: limited metrics & alerts
  limits: max 100 db's and 
            500 collections total
  logs: no
  deactivation: yes, allowed after 30 days
  auto-expand storage: no
  perf advisor: no
  real-time perf panel: no
  rolling index build: no
  custom roles: slow

trusted IP whitelist w/ atlas

Your cluster Connect button may be disabled if your cluster is in the provisioning state. Your cluster needs to provision when it is first deployed, or when it is scaled up or down. The provisoning process can take up to 10 minutes, after which the Connect button will become enabled.
