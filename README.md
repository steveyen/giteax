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

